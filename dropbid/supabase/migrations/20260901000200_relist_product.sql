-- 유찰·미결제로 끝난 상품은 판매자가 할 수 있는 일이 없었다. 화면에 "다시 올리기" 가 없고
-- DB 에도 방법이 없었다 (QA 에서 막다른 길로 확인).
-- 원본은 기록으로 그대로 두고, 같은 내용의 새 상품을 검수 대기로 만든다.

alter table products
  add column if not exists relisted_from uuid references products(id) on delete set null;

comment on column products.relisted_from is
  '이 상품이 어느 상품을 다시 올린 것인지. 같은 상품을 두 번 다시 올리는 것은 막는다.';

-- 한 상품은 한 번만 다시 올릴 수 있다. 눌러 놓고 또 누르는 것을 DB 에서 막는다.
create unique index if not exists products_relisted_from_key
  on products (relisted_from) where relisted_from is not null;

create or replace function relist_product(p_product_id uuid, p_seller_id uuid)
returns uuid
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_old products;
  v_auction_status text;
  v_new_id uuid;
begin
  select * into v_old from products where id = p_product_id for update;
  if not found then
    raise exception '없는 상품이다: %', p_product_id;
  end if;
  if v_old.seller_id is distinct from p_seller_id then
    raise exception '본인이 올린 상품만 다시 올릴 수 있다';
  end if;

  select status into v_auction_status from auctions where product_id = p_product_id;
  if v_auction_status is null or v_auction_status not in ('unsold', 'payment_failed') then
    raise exception '유찰되거나 결제 기한이 지난 상품만 다시 올릴 수 있다';
  end if;

  if exists (select 1 from products where relisted_from = p_product_id) then
    raise exception '이미 다시 올린 상품이다';
  end if;

  insert into products (seller_id, title, funding_project_name, funding_project_url,
                        category, condition_grade, photo_urls, backer_proof_url,
                        start_price, status, relisted_from)
  values (v_old.seller_id, v_old.title, v_old.funding_project_name, v_old.funding_project_url,
          v_old.category, v_old.condition_grade, v_old.photo_urls, v_old.backer_proof_url,
          v_old.start_price, 'pending', p_product_id)
  returning id into v_new_id;

  return v_new_id;
end;
$$;

revoke all on function relist_product(uuid, uuid) from public, anon, authenticated;
grant execute on function relist_product(uuid, uuid) to service_role;

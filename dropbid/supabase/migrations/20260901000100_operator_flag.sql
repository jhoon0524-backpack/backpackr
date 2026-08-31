-- 검수 화면에 아무나 들어갈 수 있었다. 일반 판매자로 로그인해도 상단에 "검수" 가 보이고,
-- 자기가 올린 상품을 자기가 승인할 수 있었다 (QA 에서 실제로 해 봤다).
-- 누가 운영자인지 DB 에 두고, 화면과 검수 함수 양쪽에서 막는다.

alter table profiles add column if not exists is_operator boolean not null default false;

comment on column profiles.is_operator is
  '운영자 여부. 검수(승인·반려) 권한. 사람이 직접 켠다.';

-- 인자를 하나 더 받는다. 기본값을 주면 옛 2인자 함수와 겹쳐 호출이 모호해지므로 먼저 지운다.
drop function if exists approve_product(uuid, uuid);
drop function if exists reject_product(uuid, text);

-- 아래 두 함수의 본문은 기존 것을 그대로 두고 운영자 검사만 앞에 붙였다.
-- (반려 알림 적재를 빠뜨리지 않도록 원본을 그대로 옮겼다.)

create function approve_product(p_product_id uuid, p_drop_id uuid, p_operator_id uuid default null)
returns uuid
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_product products;
  v_drop drops;
  v_auction_id uuid;
begin
  -- 운영자 id 를 준 경우에만 검사한다. 시드·테스트처럼 사람이 아닌 호출은 null 로 부른다.
  if p_operator_id is not null
     and not exists (select 1 from profiles where id = p_operator_id and is_operator) then
    raise exception '운영자만 검수할 수 있다';
  end if;

  select * into v_product from products where id = p_product_id for update;
  if not found then
    raise exception '없는 상품이다: %', p_product_id;
  end if;
  if v_product.status <> 'pending' then
    raise exception '검수 대기 상태가 아니다: %', v_product.status;
  end if;

  select * into v_drop from drops where id = p_drop_id;
  if not found then
    raise exception '없는 회차다: %', p_drop_id;
  end if;
  -- PRD 엣지케이스: 마감 시각이 이미 지난 회차에는 배정하지 않는다.
  if v_drop.ends_at <= now() then
    raise exception '이미 마감된 회차에는 배정할 수 없다';
  end if;

  update products set status = 'scheduled' where id = p_product_id;

  insert into auctions (product_id, drop_id, current_price, ends_at, status)
  values (p_product_id, p_drop_id, v_product.start_price, v_drop.ends_at, 'scheduled')
  returning id into v_auction_id;

  return v_auction_id;
end;
$$;

create function reject_product(p_product_id uuid, p_reason text, p_operator_id uuid default null)
returns void
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_seller_id uuid;
begin
  if p_operator_id is not null
     and not exists (select 1 from profiles where id = p_operator_id and is_operator) then
    raise exception '운영자만 검수할 수 있다';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception '반려 사유가 있어야 한다';
  end if;

  update products
     set status = 'rejected', rejection_reason = p_reason
   where id = p_product_id and status = 'pending'
  returning seller_id into v_seller_id;

  if not found then
    raise exception '검수 대기 중인 상품이 아니다: %', p_product_id;
  end if;

  insert into notifications (product_id, user_id, kind)
  values (p_product_id, v_seller_id, 'product_rejected')
  on conflict (product_id, user_id, kind) where product_id is not null do nothing;
end;
$$;

-- drop 하면서 권한도 같이 날아갔다. 원래대로 되돌린다.
revoke all on function approve_product(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function reject_product(uuid, text, uuid) from public, anon, authenticated;
grant execute on function approve_product(uuid, uuid, uuid) to service_role;
grant execute on function reject_product(uuid, text, uuid) to service_role;

-- 검수 승인 → 회차 배정 → live 전환.
--
-- 배정을 DB 함수로 두는 이유: "마감 시각이 이미 지난 상태로 배정 → 배정 거부" (PRD 엣지케이스)를
-- check 제약으로 못 막기 때문이다. now() 가 immutable 이 아니라 제약식에 쓸 수 없다.

-- 운영자가 상품을 승인하고 회차에 배정한다. 경매 한 건이 생긴다.
create function approve_product(p_product_id uuid, p_drop_id uuid)
returns uuid
language plpgsql as $$
declare
  v_product products;
  v_drop drops;
  v_auction_id uuid;
begin
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

create function reject_product(p_product_id uuid, p_reason text)
returns void
language plpgsql as $$
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception '반려 사유가 있어야 한다';
  end if;

  update products
     set status = 'rejected', rejection_reason = p_reason
   where id = p_product_id and status = 'pending';

  if not found then
    raise exception '검수 대기 중인 상품이 아니다: %', p_product_id;
  end if;
end;
$$;

-- 드롭 시작 시각이 되면 배정된 경매를 live 로 바꾼다. 스케줄러가 부른다.
-- 마감 처리와 같은 성질이라 같은 규칙을 따른다 — 멱등이고, 처리한 것을 돌려준다.
create function start_due_drops()
returns table (auction_id uuid)
language plpgsql as $$
#variable_conflict use_column
begin
  return query
  with due as (
    select a.id
      from auctions a
      join drops d on d.id = a.drop_id
     where a.status = 'scheduled'
       and d.starts_at <= now()
       -- 이미 마감 시각이 지난 것을 live 로 올리지 않는다. 올리자마자 마감될 뿐이다.
       and a.ends_at > now()
       for update skip locked
  )
  update auctions a set status = 'live'
    from due where a.id = due.id
  returning a.id;
end;
$$;

-- 스케줄러 진입점에 드롭 시작을 함께 태운다.
create or replace function run_close_due_auctions()
returns scheduler_runs
language plpgsql as $$
declare
  v_detail jsonb;
  v_processed integer;
  v_expired integer;
  v_started integer;
  v_run scheduler_runs;
begin
  select count(*) into v_started from start_due_drops();

  with closed as (
    select result from close_due_auctions()
  )
  select coalesce(jsonb_object_agg(result, n), '{}'::jsonb), coalesce(sum(n), 0)
    into v_detail, v_processed
    from (select result, count(*) as n from closed group by result) t;

  select count(*) into v_expired from expire_unpaid_orders();

  if v_started > 0 then
    v_detail := v_detail || jsonb_build_object('started', v_started);
  end if;
  if v_expired > 0 then
    v_detail := v_detail || jsonb_build_object('payment_failed', v_expired);
  end if;

  insert into scheduler_runs (job, processed, detail)
  values ('close_due_auctions', v_started + v_processed + v_expired, v_detail)
  returning * into v_run;

  return v_run;
end;
$$;

revoke all on function approve_product(uuid, uuid) from public, anon, authenticated;
revoke all on function reject_product(uuid, text) from public, anon, authenticated;
revoke all on function start_due_drops() from public, anon, authenticated;
grant execute on function approve_product(uuid, uuid) to service_role;
grant execute on function reject_product(uuid, text) to service_role;
grant execute on function start_due_drops() to service_role;

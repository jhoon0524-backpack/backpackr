-- 결제 기한이 지난 낙찰을 payment_failed 로 넘긴다 (PRD 결제).
--
-- 마감 처리와 같은 스케줄러가 부른다. 같은 성질이라 같은 규칙을 따른다 — 멱등이고,
-- 처리한 것을 돌려주므로 실행 기록에 남는다.

create function expire_unpaid_orders()
returns table (order_id uuid, auction_id uuid)
language plpgsql as $$
#variable_conflict use_column
begin
  return query
  with due as (
    select o.id, o.auction_id
      from orders o
     where o.status = 'pending' and o.due_at <= now()
       for update skip locked
  ), failed_orders as (
    update orders o set status = 'failed'
      from due d where o.id = d.id
    returning o.id, o.auction_id
  ), failed_auctions as (
    -- 경매도 payment_failed 로 넘긴다. 판매자 화면이 경매 상태로 판단한다.
    update auctions a set status = 'payment_failed'
      from failed_orders f where a.id = f.auction_id
    returning a.id
  )
  select f.id, f.auction_id from failed_orders f;
end;
$$;

-- 스케줄러 진입점에 결제 기한 만료를 함께 태운다.
-- 마감과 만료는 같은 1분 주기라 잡을 나눌 이유가 없다.
create or replace function run_close_due_auctions()
returns scheduler_runs
language plpgsql as $$
declare
  v_detail jsonb;
  v_processed integer;
  v_expired integer;
  v_run scheduler_runs;
begin
  with closed as (
    select result from close_due_auctions()
  )
  select coalesce(jsonb_object_agg(result, n), '{}'::jsonb), coalesce(sum(n), 0)
    into v_detail, v_processed
    from (select result, count(*) as n from closed group by result) t;

  select count(*) into v_expired from expire_unpaid_orders();

  if v_expired > 0 then
    v_detail := v_detail || jsonb_build_object('payment_failed', v_expired);
  end if;

  insert into scheduler_runs (job, processed, detail)
  values ('close_due_auctions', v_processed + v_expired, v_detail)
  returning * into v_run;

  return v_run;
end;
$$;

revoke all on function expire_unpaid_orders() from public, anon, authenticated;
grant execute on function expire_unpaid_orders() to service_role;

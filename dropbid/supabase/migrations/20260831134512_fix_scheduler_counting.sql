-- 스케줄러 두 군데를 고친다.
--
-- 1. needs_operator 를 처리 건수에서 뺀다.
--    최고입찰자가 계정을 지운 경매는 자동으로 확정하지 않고 그대로 둔다. 그래서 매 실행마다 다시 잡힌다.
--    그걸 "처리했다" 로 세면 1분마다 processed 가 1씩 잡혀 지표가 오염된다. 아무것도 처리하지 않았다.
--    detail 에는 계속 남긴다 — 사람이 손대기 전까지 계속 떠 있어야 하는 알림이다.
--
-- 2. start_due_drops 가 drops 행까지 잠그던 것을 auctions 만 잠그도록 좁힌다.
--    조인에 그냥 for update 를 걸면 양쪽 테이블 행이 다 잠긴다.
--    한 회차의 drop 행이 잠기면 skip locked 가 그 회차 경매를 통째로 건너뛴다.

create or replace function start_due_drops()
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
       for update of a skip locked
  )
  update auctions a set status = 'live'
    from due where a.id = due.id
  returning a.id;
end;
$$;

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
  select coalesce(jsonb_object_agg(result, n), '{}'::jsonb),
         -- needs_operator 는 사람이 손대야 하는 것이라 처리한 것이 아니다.
         coalesce(sum(n) filter (where result <> 'needs_operator'), 0)
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

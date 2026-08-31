-- 스케줄러 실행 기록. "마감 처리 스케줄러의 실행·처리 건수가 기록된다" (PRD 인수 조건).
--
-- 처리 건수가 0 인 실행도 남긴다. 기록이 끊긴 구간이 곧 스케줄러가 멈춘 구간이다.
-- 그걸 알 수 없으면 "스케줄러가 지연되어 마감 처리를 건너뜀" (PRD 엣지케이스)을 발견할 방법이 없다.

create table scheduler_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  ran_at timestamptz not null default now(),
  processed integer not null default 0,
  -- 결과별 건수. 예: {"sold": 3, "unsold": 1, "needs_operator": 0}
  detail jsonb not null default '{}'::jsonb
);

create index scheduler_runs_job_ran_at_idx on scheduler_runs (job, ran_at desc);

-- pg_cron 이 부르는 진입점. 마감 처리를 돌리고 그 결과를 기록한다.
create function run_close_due_auctions()
returns scheduler_runs
language plpgsql as $$
declare
  v_detail jsonb;
  v_processed integer;
  v_run scheduler_runs;
begin
  with closed as (
    select result from close_due_auctions()
  )
  select coalesce(jsonb_object_agg(result, n), '{}'::jsonb), coalesce(sum(n), 0)
    into v_detail, v_processed
    from (select result, count(*) as n from closed group by result) t;

  insert into scheduler_runs (job, processed, detail)
  values ('close_due_auctions', v_processed, v_detail)
  returning * into v_run;

  return v_run;
end;
$$;

revoke all on function run_close_due_auctions() from public, anon, authenticated;
grant execute on function run_close_due_auctions() to service_role;
revoke insert, update, delete, truncate on scheduler_runs from anon, authenticated;

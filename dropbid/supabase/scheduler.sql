-- pg_cron 잡 등록. **사람이 직접 실행한다** (CLAUDE.md 4장).
-- 마이그레이션에 넣지 않은 이유는, 이걸 적용하는 순간 프로덕션에서 1분마다 경매가 마감되기 때문이다.
-- 마이그레이션은 스키마만 바꾸고, 실제로 돌기 시작하는 시점은 사람이 정한다.
--
-- Supabase 대시보드의 SQL Editor 에서 실행한다.

-- 1. 확장을 켠다 (Supabase 는 프로젝트당 한 번).
create extension if not exists pg_cron;

-- 2. 1분 주기로 마감 처리를 건다.
select cron.schedule(
  'close-due-auctions',
  '* * * * *',
  $$select run_close_due_auctions()$$
);

-- 3. 등록됐는지 본다.
-- select jobid, jobname, schedule, active from cron.job;

-- 4. 돌고 있는지 본다. 기록이 끊긴 구간이 곧 스케줄러가 멈춘 구간이다.
-- select ran_at, processed, detail from scheduler_runs
--  where job = 'close_due_auctions' order by ran_at desc limit 20;

-- 멈출 때:
-- select cron.unschedule('close-due-auctions');

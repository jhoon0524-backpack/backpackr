-- 로컬 전용. Docker 를 못 쓰는 환경에서 순수 Postgres 로 마이그레이션을 돌리기 위한 준비다.
-- Supabase 스택이 원래 만들어 주는 것 중 마이그레이션이 참조하는 최소한만 흉내낸다.
-- 프로덕션에는 절대 적용하지 않는다. supabase/migrations/ 가 아닌 곳에 둔 이유다.

drop schema if exists public cascade;
create schema public;

drop schema if exists auth cascade;
create schema auth;

-- 실제 auth.users 는 훨씬 크다. 마이그레이션이 외래키로 참조하는 부분만 둔다.
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

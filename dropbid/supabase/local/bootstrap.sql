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

-- Supabase 가 만들어 주는 역할들. 권한 마이그레이션이 이 이름으로 grant/revoke 한다.
do $$
begin
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
exception when duplicate_object then null;
end $$;

grant usage on schema public to anon, authenticated, service_role;
-- Supabase 는 public 스키마의 테이블 권한을 이 역할들에 기본으로 준다.
-- 그 상태에서 시작해야 권한 마이그레이션의 revoke 가 의미를 갖는다.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

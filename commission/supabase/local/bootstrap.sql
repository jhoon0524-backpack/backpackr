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
  -- Supabase 의 service_role 은 RLS 를 통과한다 (서버 라우트가 이 역할로 붙는다).
  create role service_role nologin bypassrls;
exception when duplicate_object then null;
end $$;

-- 역할은 스키마를 지워도 남는다. 이미 있던 경우에도 속성이 맞도록 따로 건다.
alter role service_role bypassrls;
alter role anon nobypassrls;
alter role authenticated nobypassrls;

-- Supabase 가 제공하는 함수. RLS 정책이 이걸로 "내 것" 을 가린다.
-- 로컬에서는 세션 변수로 흉내낸다.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- Supabase 는 public 스키마의 테이블 권한을 이 역할들에 기본으로 준다.
-- 그 상태에서 시작해야 권한 마이그레이션의 revoke 가 의미를 갖는다.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;

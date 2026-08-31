-- 계정과 상품. 금액은 전부 원 단위 정수다 (원화에 소수점이 없다).

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nickname text,
  -- 연락처가 없으면 상품 등록과 입찰을 차단한다. 가입 시점에는 없을 수 있다.
  phone text,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles (id),

  title text not null,
  -- 원 펀딩 프로젝트. 판매자가 직접 입력한 텍스트와 공개 링크로만 다룬다.
  -- 텀블벅 내부 데이터·API 는 쓰지 않는다 (PRD 의존성).
  funding_project_name text not null,
  funding_project_url text,
  category text not null,
  condition_grade text not null,

  -- 사진 최소 3장. 후원 인증 이미지는 필수라 not null 자체가 "없으면 등록 거부" 규칙이다.
  photo_urls text[] not null check (array_length(photo_urls, 1) >= 3),
  backer_proof_url text not null,

  start_price integer not null check (start_price >= 1000),

  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'rejected')),
  -- 반려하면 사유를 반드시 남긴다. 판매자에게 그대로 전달된다.
  rejection_reason text,
  constraint rejected_needs_reason check (
    status <> 'rejected' or rejection_reason is not null
  ),

  created_at timestamptz not null default now()
);

-- 운영자 검수 화면이 pending 목록을 먼저 본다.
create index products_status_created_at_idx on products (status, created_at);
create index products_seller_id_idx on products (seller_id);

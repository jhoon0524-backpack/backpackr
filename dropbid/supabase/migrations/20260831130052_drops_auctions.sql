-- 드롭 회차와 경매.

create table drops (
  id uuid primary key default gen_random_uuid(),
  round_number integer not null unique,
  starts_at timestamptz not null,
  -- 회차에 속한 모든 경매가 이 시각에 함께 마감한다. 개별 경매는 연장으로 이보다 뒤로 밀릴 수 있다.
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint drop_ends_after_start check (ends_at > starts_at)
);

create table auctions (
  id uuid primary key default gen_random_uuid(),
  -- 한 상품은 경매 하나로만 올라간다.
  product_id uuid not null unique references products (id),
  drop_id uuid not null references drops (id),

  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'sold', 'unsold', 'payment_failed')),

  -- 상품의 시작가로 초기화한다. 입찰이 아직 없으면 highest_bidder_id 가 null 이다.
  current_price integer not null check (current_price >= 0),
  -- 계정을 지워도 입찰·경매 기록은 남긴다. 최고입찰자 자리는 비고 운영자가 처리한다 (PRD 엣지케이스).
  highest_bidder_id uuid references profiles (id) on delete set null,

  -- 회차 마감 시각으로 초기화하되, 마감 임박 입찰이 들어오면 이 값만 뒤로 밀린다.
  ends_at timestamptz not null,
  extension_count integer not null default 0
    check (extension_count between 0 and 20),

  winner_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),

  -- 낙찰이면 낙찰자가 있어야 하고, 유찰이면 없어야 한다.
  constraint sold_needs_winner check (status <> 'sold' or winner_id is not null),
  constraint unsold_has_no_winner check (status <> 'unsold' or winner_id is null)
);

-- 1분 주기 마감 스케줄러가 "마감 시각이 지난 live" 를 찾는 경로.
create index auctions_status_ends_at_idx on auctions (status, ends_at);
-- 드롭 목록 화면이 회차별로 마감 임박순을 뽑는 경로.
create index auctions_drop_id_ends_at_idx on auctions (drop_id, ends_at);

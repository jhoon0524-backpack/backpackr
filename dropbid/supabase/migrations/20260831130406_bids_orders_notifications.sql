-- 입찰 기록, 주문, 알림.
-- 세 테이블 모두 사람을 가리키는 칸은 `on delete set null` 이다.
-- 계정을 지워도 기록은 익명으로 남는다 (PRD 엣지케이스).

-- 성공한 입찰만이 아니라 거부된 시도까지 전부 남긴다 (PRD 인수 조건).
-- 성립률 지표도 이 테이블에서 뽑는다: 경매별 outcome='accepted' 인 유니크 bidder_id 가 2명 이상인가.
create table bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references auctions (id),
  bidder_id uuid references profiles (id) on delete set null,
  amount integer not null check (amount > 0),

  outcome text not null check (outcome in ('accepted', 'rejected')),
  -- 거부 사유 코드. place_bid 의 거부 순서와 1:1 로 맞춘다.
  reject_reason text check (reject_reason in (
    'not_live',           -- 경매가 live 가 아니다
    'seller_cannot_bid',  -- 판매자 본인이다
    'already_highest',    -- 이미 최고입찰자다
    'amount_too_low'      -- 현재가 + 최소 인상폭 미만이다
  )),
  constraint reject_reason_matches_outcome check (
    (outcome = 'rejected' and reject_reason is not null)
    or (outcome = 'accepted' and reject_reason is null)
  ),

  created_at timestamptz not null default now()
);

create index bids_auction_id_created_at_idx on bids (auction_id, created_at);
-- 성립률 계산이 훑는 경로.
create index bids_accepted_bidder_idx on bids (auction_id, bidder_id)
  where outcome = 'accepted';

-- 낙찰 건마다 하나. 결제 수단 정보는 저장하지 않는다 — PG 가 들고 있고 우리는 거래 식별자만 갖는다.
create table orders (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique references auctions (id),
  buyer_id uuid references profiles (id) on delete set null,
  amount integer not null check (amount > 0),

  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed')),
  -- 낙찰 확정 시점 + 24시간. 이 시각을 넘기면 failed 로 넘어간다.
  due_at timestamptz not null,
  paid_at timestamptz,
  -- 포트원 거래 식별자.
  payment_id text,

  created_at timestamptz not null default now(),

  constraint paid_needs_paid_at check (status <> 'paid' or paid_at is not null),
  constraint unpaid_has_no_paid_at check (status = 'paid' or paid_at is null)
);

-- 결제 기한 만료를 훑는 스케줄러 경로.
create index orders_status_due_at_idx on orders (status, due_at);

-- 발송 시도마다 한 줄. 실패도 남긴다 (PRD 알림).
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  -- 경매에 딸린 알림이면 채운다. 상품 반려처럼 경매 이전 알림은 비어 있다.
  auction_id uuid references auctions (id),

  kind text not null check (kind in (
    'outbid',           -- 상위 입찰이 들어왔다
    'won',              -- 낙찰됐다
    'unsold',           -- 유찰됐다
    'payment_due',      -- 결제 기한 3시간 전이다
    'payment_failed',   -- 기한 내 결제가 없었다
    'product_rejected'  -- 검수에서 반려됐다
  )),
  channel text not null check (channel in ('alimtalk', 'email')),
  status text not null check (status in ('sent', 'failed')),
  -- 실패 사유. 알림톡이 실패하면 email 채널로 한 줄 더 쌓인다.
  error text,

  created_at timestamptz not null default now(),

  constraint failed_needs_error check (status <> 'failed' or error is not null)
);

-- "낙찰은 1회만 확정되고 알림도 1회만 발송된다" (PRD 인수 조건) 를 스키마가 강제한다.
-- 스케줄러가 두 번 돌아도 같은 (경매, 수신자, 종류, 채널) 조합은 두 번 들어가지 않는다.
-- 알림톡 실패 후 이메일 폴백은 channel 이 달라 막히지 않는다.
create unique index notifications_once_per_event_idx
  on notifications (auction_id, user_id, kind, channel)
  where auction_id is not null;

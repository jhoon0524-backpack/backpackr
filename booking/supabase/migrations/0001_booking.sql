-- 미팅 예약 링크 v1 — handoff.md 2장을 Postgres 로 옮긴 것.
--
-- MySQL 안과 달라진 곳 두 군데.
--   start_at 을 timestamptz 로 둔다. MySQL DATETIME 에는 타임존이 없어 "KST 로컬 시각"
--   이라는 규약을 코드가 지켜야 했지만, timestamptz 는 순간을 그대로 담아 규약이 필요 없다.
--   AUTO_INCREMENT 대신 bigserial, JSON 대신 jsonb 를 쓴다.
--
-- uk_slot 이 이 스키마의 핵심이다. 활성 예약은 canceled_ref = 0 으로 고정이라
-- (page_id, start_at, 0) 이 중복되어 슬롯당 1건에서 막힌다. 취소하면 canceled_ref 를
-- 자기 seq 로 갱신해 슬롯이 풀리고, 같은 슬롯의 취소 이력은 계속 쌓인다.
--
-- canceled_at(nullable) 을 unique 에 넣으면 안 된다. Postgres 도 MySQL 과 마찬가지로
-- unique 인덱스에서 NULL 을 서로 다른 값으로 취급해 활성 예약끼리 중복이 안 막힌다.

create table booking_page (
    id            bigserial primary key,
    member_id     uuid         not null,        -- auth.users.id
    slug          varchar(16)  not null unique,
    title         varchar(100) not null,
    description   varchar(500),
    duration_min  int          not null check (duration_min in (15, 30, 60)),
    weekly_hours  jsonb        not null,        -- {"MON":[["10:00","12:00"]], ...}
    blocked_dates jsonb        not null default '[]'::jsonb,
    meeting_url   varchar(500),
    active        boolean      not null default true,
    created_at    timestamptz  not null default now(),
    updated_at    timestamptz  not null default now()
);

create table booking (
    seq           bigserial primary key,
    id            uuid         not null unique default gen_random_uuid(),  -- 공개 취소 링크
    page_id       bigint       not null references booking_page (id),
    start_at      timestamptz  not null,
    guest_name    varchar(50),
    guest_company varchar(100),
    guest_email   varchar(255),
    guest_phone   varchar(30),
    memo          varchar(1000),
    gcal_event_id varchar(255),
    sync_error    varchar(30),                  -- MAIL / CAL_DELETE 콤마 결합. null = 정상
    created_at    timestamptz  not null default now(),
    canceled_at   timestamptz,
    canceled_ref  bigint       not null default 0,   -- 0 = 활성, 취소 시 seq 값

    constraint uk_slot unique (page_id, start_at, canceled_ref)
);

-- refresh_token 이 bytea 가 아니라 text 다. PostgREST 로는 bytea 가 \x 헥사 문자열로
-- 오가서 어차피 인코딩을 한 겹 거친다. 봉인된 바이트는 어차피 불투명하므로
-- base64 문자열로 두고 인코딩을 한 군데(lib/crypto.ts)에만 남긴다.
create table calendar_token (
    member_id     uuid         primary key,     -- auth.users.id
    refresh_token text         not null,        -- base64(iv ‖ tag ‖ 암호문)
    calendar_id   varchar(255) not null,
    created_at    timestamptz  not null default now()
);

-- 파기용 인덱스를 만들지 않는다. 담당자 5명 × 몇 년치라 수천 행이고,
-- 하루 한 번 풀스캔이 인덱스 유지비보다 싸다.
-- 슬롯 조회는 uk_slot 이 (page_id, start_at, ...) 순서라 그대로 탄다.

-- 모든 접근은 서버 라우트를 거친다. 브라우저에서 직접 읽을 일이 없으므로
-- RLS 를 켜고 정책을 만들지 않는다 — anon 키로는 아무것도 못 읽는다.
alter table booking_page   enable row level security;
alter table booking        enable row level security;
alter table calendar_token enable row level security;

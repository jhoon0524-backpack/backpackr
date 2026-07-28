-- 미팅 예약 링크 v1 — handoff.md 2장 그대로.
-- uk_slot 이 이 스키마의 핵심이다. 활성 예약은 canceled_ref = 0 으로 고정이라
-- (page_id, start_at, 0) 이 중복되어 슬롯당 1건에서 막힌다.

CREATE TABLE booking_page (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    member_id       BIGINT       NOT NULL,
    slug            VARCHAR(16)  NOT NULL,
    title           VARCHAR(100) NOT NULL,
    description     VARCHAR(500)     NULL,
    duration_min    INT          NOT NULL,           -- 15 | 30 | 60
    weekly_hours    JSON         NOT NULL,           -- {"MON":[["10:00","12:00"]], ...}
    blocked_dates   JSON         NOT NULL,           -- ["2026-08-11", ...]
    meeting_url     VARCHAR(500)     NULL,
    active          TINYINT(1)   NOT NULL DEFAULT 1,
    created_at      DATETIME(6)  NOT NULL,
    updated_at      DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE booking (
    seq             BIGINT       NOT NULL AUTO_INCREMENT,
    id              CHAR(36)     NOT NULL,           -- UUIDv4. 공개 취소 링크에 사용
    page_id         BIGINT       NOT NULL,
    start_at        DATETIME     NOT NULL,           -- KST 기준 로컬 시각
    guest_name      VARCHAR(50)      NULL,
    guest_company   VARCHAR(100)     NULL,
    guest_email     VARCHAR(255)     NULL,
    guest_phone     VARCHAR(30)      NULL,
    memo            VARCHAR(1000)    NULL,
    gcal_event_id   VARCHAR(255)     NULL,
    sync_error      VARCHAR(30)      NULL,           -- MAIL / CAL_DELETE 콤마 결합. NULL = 정상
    created_at      DATETIME(6)  NOT NULL,
    canceled_at     DATETIME(6)      NULL,
    canceled_ref    BIGINT       NOT NULL DEFAULT 0, -- 0 = 활성, 취소 시 seq 값
    PRIMARY KEY (seq),
    UNIQUE KEY uk_public_id (id),
    UNIQUE KEY uk_slot (page_id, start_at, canceled_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE calendar_token (
    member_id     BIGINT       NOT NULL,
    refresh_token VARBINARY(512) NOT NULL,           -- 암호화 저장
    calendar_id   VARCHAR(255) NOT NULL,
    PRIMARY KEY (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

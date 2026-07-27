# 개발 핸드오프 — 미팅 예약 링크 (v1)

기획 문서는 [meeting-scheduler.md](./meeting-scheduler.md), 화면은 [wireframes.html](./wireframes.html).
이 문서는 그 두 개를 코드로 옮기기 위한 것만 담는다. 왜 이렇게 만드는지는 PRD를 본다.

---

## 코드 사다리

무언가를 짜기 전에 위에서부터 내려온다. 걸리는 첫 단에서 멈춘다.

```
1. 이게 존재해야 하는가?      → 아니면 안 만든다
2. 이 코드베이스에 있는가?     → 재사용한다, 다시 쓰지 않는다
3. 표준 라이브러리가 하는가?    → 쓴다
4. 플랫폼 기본 기능인가?       → 쓴다
5. 이미 깔린 의존성이 하는가?   → 쓴다
6. 한 줄인가?                → 한 줄로 쓴다
7. 그제서야: 동작하는 최소한
```

이 사다리를 스펙에 적용해 내린 결정들. 아래 장들은 그 결과다.

| 단 | 항목 | 결정 |
|---|---|---|
| 1 | `lead_time_hours` · `window_days` 컬럼 | **상수로 둔다.** 담당자마다 다르게 쓸 근거가 없다. 컬럼 2개 + 폼 필드 2개 + 검증이 사라진다. 요청이 나오면 그때 컬럼으로 올린다 |
| 1 | 예약 변경 기능 | 만들지 않는다. 취소 후 재예약이 같은 결과다 |
| 2 | 메일 발송 | 기존 알림 모듈 재사용. 발송기를 새로 만들지 않는다 |
| 2 | refresh token 암호화 | **기존 암호화 유틸을 찾아 쓴다.** 새 암복호 클래스를 만들지 않는다 |
| 2 | 담당자 인증 | 기존 `admin` 세션 인증 |
| 3 | 슬러그 8자 | `UUID.randomUUID().toString().substring(0, 8)` — 생성기 클래스를 만들지 않는다 |
| 3 | 시간 겹침 판정 | `LocalDateTime` 비교. Interval·Range 클래스를 만들지 않는다 |
| 3 | JSON 컬럼 매핑 | `AttributeConverter` 2개 + 이미 있는 Jackson. **JSON 매핑 라이브러리를 새로 넣지 않는다** |
| 4 | 동시 예약 방지 | DB unique 제약. 애플리케이션 락을 만들지 않는다 |
| 4 | 파기 중복 실행 방지 | 필요 없다. UPDATE가 멱등하다 |
| 5 | 구글 캘린더 SDK | **넣지 않는다.** 필요한 호출이 5개뿐이라 이미 있는 HTTP 클라이언트로 직접 부른다 (아래) |
| 6 | 연동 여부 판별 | `calendarTokenRepository.existsById(memberId)` |
| 6 | 취소 가능 판별 | `booking.startAt.minusHours(2).isAfter(now)` |
| 6 | 파기 | UPDATE 쿼리 1개 |

**구글 캘린더를 SDK 없이 부르는 이유** — `google-api-services-calendar`는 트랜지티브 의존성이 크고, 이 기능이 실제로 쓰는 건 5개 호출뿐이다.

```
POST https://oauth2.googleapis.com/token                          # 코드 교환 · 토큰 갱신
POST https://www.googleapis.com/calendar/v3/freeBusy              # busy 조회
POST .../calendar/v3/calendars/{calendarId}/events?sendUpdates=all # 이벤트 생성 + 초대
DEL  .../calendar/v3/calendars/{calendarId}/events/{eventId}?sendUpdates=all
```

동의 화면 URL은 쿼리 파라미터를 붙인 문자열이라 호출이 아니다. 다섯 개 다 평범한 JSON 요청이고, 응답에서 꺼내 쓰는 필드는 `access_token`·`calendars[].busy[]`·`id`뿐이다.

---

## 0. 시작 전 준비물

착수 전에 받아둬야 하는 것. 셋 다 개발 외 작업이고, 없으면 T3부터 막힌다.

| 항목 | 받는 곳 | 비고 |
|---|---|---|
| GCP 프로젝트 + OAuth 클라이언트 | 인프라 담당 | **User Type을 Internal로 게시.** External로 만들면 앱 검증 심사가 붙는다 |
| 슬랙 인커밍 웹훅 URL | 워크스페이스 관리자 | 담당자 알림용 채널 하나 |
| 메일 발신 주소 | 기존 알림 모듈 설정 확인 | 신규 발신 도메인이면 SPF/DKIM 확인 필요 |

**환경 변수**

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI      # {admin-host}/admin/api/calendar/callback
SLACK_WEBHOOK_URL
BOOKING_BASE_URL         # 공개 예약 링크 도메인. 확정 메일·취소 링크에 사용
MAIL_FROM
```

### GCP OAuth 클라이언트 발급 절차

콘솔 메뉴 이름은 개편이 잦다. 최근에는 "OAuth 동의 화면"이 **Google Auth Platform** 아래로 옮겨졌다. 이름이 다르면 같은 성격의 메뉴를 찾는다.

**1) 프로젝트와 API**

- [console.cloud.google.com](https://console.cloud.google.com)에서 프로젝트를 만든다. **회사 Workspace 조직(backpac.kr) 아래여야 한다.** 개인 계정 아래에 만들면 2)의 Internal 옵션이 나오지 않는다.
- API 및 서비스 → 라이브러리 → `Google Calendar API` 사용 설정.

**2) OAuth 동의 화면**

| 항목 | 값 |
|---|---|
| User Type | **Internal** |
| 앱 이름 | 미팅 예약 링크 (담당자 동의 화면에 표시) |
| 사용자 지원 이메일 | 담당자 주소 |
| 승인된 도메인 | `backpac.kr` |

Internal이면 구글 앱 검증 심사가 없다. 조직 내 계정만 연동할 수 있는데, 연동 주체가 영업 담당자 본인뿐이라 이걸로 충분하다.

**3) 스코프 — 두 개만**

```
https://www.googleapis.com/auth/calendar.freebusy   # busy 구간 조회
https://www.googleapis.com/auth/calendar.events     # 이벤트 생성·삭제
```

전체 권한 스코프(`.../auth/calendar`)는 넣지 않는다. 이 두 개로 필요한 5개 호출이 전부 커버된다.

**4) 클라이언트 ID**

사용자 인증 정보 → OAuth 클라이언트 ID → **웹 애플리케이션**.
승인된 리디렉션 URI에 `https://{admin-host}/admin/api/calendar/callback`을 등록한다. 스테이징·운영 두 개를 함께 등록해 둔다.

리디렉션 URI는 `GOOGLE_REDIRECT_URI`와 **프로토콜·후행 슬래시까지 정확히** 같아야 한다. 다르면 `redirect_uri_mismatch`가 난다.

**동의 화면 URL** — 6번 엔드포인트가 302로 보낼 주소

```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id={GOOGLE_CLIENT_ID}
  &redirect_uri={GOOGLE_REDIRECT_URI}
  &response_type=code
  &scope=<위 두 스코프를 공백으로 연결>
  &access_type=offline
  &prompt=consent
  &state=<CSRF 토큰>
```

`access_type=offline`이 없으면 refresh token이 오지 않는다. **연동 직후에는 정상 동작하다가 한 시간 뒤 슬롯 조회가 통째로 죽는다.** `prompt=consent`는 재연동 때도 refresh token을 다시 받기 위해 필요하다.

**콜백** — 7번 엔드포인트

```
POST https://oauth2.googleapis.com/token
  code, client_id, client_secret, redirect_uri, grant_type=authorization_code
→ 응답의 refresh_token을 암호화해 calendar_token 에 저장
```

`calendar_id`는 `primary`를 넣는다. 담당자 기본 캘린더를 가리키는 예약어라 실제 ID를 조회할 필요가 없다.

> **발급 전 마지막 확인 — User Type이 Internal인가.**
> External + 게시 상태 "테스트"로 두면 **refresh token이 7일마다 만료된다.** 개발 중에는 멀쩡하다가 배포 후 매주 재연동을 요구하는 형태로 나타나 원인을 찾기 번거롭다. Internal 앱에는 이 제한이 없다.

---

## 1. 모듈 배치

| 모듈 | 넣는 것 |
|---|---|
| `core` | `booking` 도메인 — 엔티티, 리포지토리, 슬롯 계산, 예약 확정/취소 서비스 |
| `core` | `booking.calendar` — 구글 캘린더 클라이언트(HTTP 5개 호출), 토큰 저장·갱신 |
| `api` | 공개 엔드포인트 (`/api/booking/**`, `/api/bookings/**`) — 인증 없음 |
| `admin` | 담당자 엔드포인트 (`/admin/api/**`) — 기존 admin 인증 재사용 |
| `api` 또는 `admin` | `@Scheduled` 파기 작업 1개. **`batch` 모듈을 새로 붙이지 않는다** |

**새로 추가하는 의존성은 0개다.** RabbitMQ·Quartz·Redisson·Algolia는 물론 구글 API SDK와 JSON 매핑 라이브러리도 넣지 않는다.

---

## 2. DDL

```sql
CREATE TABLE booking_page (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    member_id       BIGINT       NOT NULL,
    slug            VARCHAR(16)  NOT NULL,
    title           VARCHAR(100) NOT NULL,
    description     VARCHAR(500)     NULL,
    duration_min    INT          NOT NULL,           -- 15 | 30 | 60
    weekly_hours    JSON         NOT NULL,           -- 아래 형식 참고
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
```

**넣지 않은 것들** — 있으면 좋아 보이지만 코드를 늘리기만 한다.

| 안 넣음 | 대신 | 
|---|---|
| `purged_at` 컬럼 + 인덱스 | 파기 대상 판별은 `guest_email IS NOT NULL`로 충분하다. 이미 비운 행은 자동으로 걸러진다 |
| `booking` 파기용 인덱스 | 담당자 5명 × 몇 년치라 수천 행이다. 하루 한 번 풀스캔이 인덱스 유지비보다 싸다 |
| `booking_page.idx_member` | 담당자당 예약 유형 몇 개다. 인덱스 탈 일이 없다 |
| `calendar_token.connected_at`·`revoked_at` | 연동 해제는 row DELETE다. **행의 존재 여부가 곧 연동 상태**다 |
| `booking` 상태 enum 컬럼 | `canceled_ref = 0` 여부가 상태다 |
| 취소 사유 컬럼 | 컬럼 + 폼 필드 + 메일 템플릿 한 줄이 붙는다. 취소 알림을 받은 담당자가 물어보면 된다 |
| `lead_time_hours` · `window_days` 컬럼 | 상수 `LEAD_TIME_HOURS = 4`, `WINDOW_DAYS = 14`. 담당자별로 다르게 쓸 근거가 나오면 그때 컬럼으로 올린다 |

**`uk_slot`이 이 스키마의 핵심이다.** 활성 예약은 `canceled_ref = 0`으로 고정이라 `(page_id, start_at, 0)`이 중복되어 슬롯당 1건에서 막힌다. 취소 시 `canceled_ref = seq`로 갱신하면 슬롯 점유가 풀리고, 같은 슬롯의 취소 이력은 `seq`가 달라 계속 쌓인다. 이 인덱스가 `(page_id, start_at, ...)` 순서라 슬롯 조회 쿼리도 그대로 탄다 — 조회용 인덱스를 따로 만들지 않는다.

> `canceled_at`(nullable)을 대신 키에 넣으면 안 된다. MySQL은 unique 인덱스에서 NULL을 서로 다른 값으로 취급해 활성 예약끼리 중복이 차단되지 않는다. **판별 컬럼은 NOT NULL이어야 한다.**

`weekly_hours` 형식 — 요일별 구간 배열. 없는 요일은 예약을 받지 않는다.

```json
{ "MON": [["10:00","12:00"], ["14:00","18:00"]],
  "TUE": [["10:00","18:00"]] }
```

---

## 3. API

인증 없음 = 외부 리드가 호출. `/admin/**`은 기존 admin 세션 인증.

| # | 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|---|
| 1 | GET | `/admin/api/booking-pages` | 필요 | **화면 ① 전체** — 예약 유형 목록 + 캘린더 연동 상태 + 다가오는 예약 |
| 2 | POST | `/admin/api/booking-pages` | 필요 | 생성. slug 랜덤 8자, 충돌 시 재생성 |
| 3 | PUT | `/admin/api/booking-pages/{id}` | 필요 | 수정. 비활성 토글도 여기서 처리 |
| 4 | DELETE | `/admin/api/booking-pages/{id}` | 필요 | 삭제. 미래 활성 예약 있으면 **409** |
| 5 | DELETE | `/admin/api/bookings/{uuid}` | 필요 | 담당자 취소. 시간 제한 없음 |
| 6 | GET | `/admin/api/calendar/connect` | 필요 | 구글 동의 화면으로 302 |
| 7 | GET | `/admin/api/calendar/callback` | 필요 | OAuth 콜백. refresh token 저장 |
| 8 | DELETE | `/admin/api/calendar` | 필요 | 연동 해제. row DELETE |
| 9 | GET | `/api/booking/{slug}` | 없음 | 페이지 메타 — 제목·설명·담당자·소요시간·`bookable` |
| 10 | GET | `/api/booking/{slug}/slots?from=&to=` | 없음 | 슬롯 목록. 최대 `WINDOW_DAYS` 범위 |
| 11 | POST | `/api/booking/{slug}` | 없음 | 예약 확정 |
| 12 | GET | `/api/bookings/{uuid}` | 없음 | 취소 화면용 예약 조회 |
| 13 | DELETE | `/api/bookings/{uuid}` | 없음 | 예약자 취소. 2시간 전 이후면 **409** |

1번이 화면 ①에 필요한 것을 한 번에 반환한다. 예약 목록을 별도 엔드포인트로 나누면 소비자가 하나뿐인데 호출만 두 번이 된다.

**응답 코드 규약**

| 코드 | 상황 | 프런트 처리 |
|---|---|---|
| 409 `SLOT_TAKEN` | 11번에서 `uk_slot` 충돌 | 입력값 유지한 채 시간 선택 단계로 복귀 |
| 409 `CANCEL_WINDOW_CLOSED` | 13번, 미팅 2시간 이내 | 담당자 연락처 안내 |
| 409 `HAS_FUTURE_BOOKINGS` | 4번, 미래 예약 존재 | 삭제 버튼 비활성 + 사유 표기 |
| 503 `CALENDAR_FAILED` | 11번, 이벤트 생성 실패 | 재시도 안내. **예약은 저장되지 않음** |

캘린더 미연동·토큰 철회는 **에러가 아니라 상태**다. 9번이 `bookable: false`를 반환하고 프런트는 10번을 호출하지 않는다. 별도 503 코드를 두지 않는다 — 안내 문구를 렌더하려면 어차피 페이지 메타가 필요해서, 에러로 만들면 본문을 못 싣는다.

**예외 클래스는 1개다.** 코드별로 클래스를 만들지 않는다.

```java
class BookingException extends RuntimeException {
    enum Code { SLOT_TAKEN, CANCEL_WINDOW_CLOSED, HAS_FUTURE_BOOKINGS, CALENDAR_FAILED }
    final Code code;   // → @ExceptionHandler 하나가 code 별 HTTP status 매핑
}
```

---

## 4. 슬롯 계산

10번 엔드포인트의 전부다. 여기서 어긋나면 이중 부킹이 난다.

```
입력: page, from, to   (to − from ≤ WINDOW_DAYS)

1. 후보 생성
   for 각 날짜 d in [from, to]:
       if d in page.blocked_dates: continue
       for 각 구간 (s, e) in page.weekly_hours[d.요일]:
           t = s
           while t + duration_min ≤ e:
               후보 += (d, t)
               t += duration_min          ← 구간 시작점 기준 정렬

2. 리드타임 제외
   후보에서 (now + LEAD_TIME_HOURS) 이전 시각 제거

3. 활성 예약 제외
   SELECT start_at FROM booking
    WHERE page_id = ? AND canceled_ref = 0 AND start_at BETWEEN ? AND ?
   → 일치하는 후보 제거

4. 캘린더 busy 제외
   freebusy.query(calendar_id, from, to)
   → busy 구간과 [t, t+duration) 이 겹치면 제거 (경계 접촉은 겹침 아님)

5. 반환
```

- 시각은 전부 KST 로컬로 다룬다. 타임존 변환을 넣지 않는다.
- 2번의 정렬 기준은 **구간 시작점**이다. 자정이나 정시가 아니다. 10:00–12:00 / 30분이면 10:00·10:30·11:00·11:30, 10:15–11:45 / 30분이면 10:15·10:45·11:15다.
- 4번의 freebusy 호출은 요청당 1회다. 날짜별로 나눠 부르지 않는다.

---

## 5. 예약 확정 트랜잭션

11번. **순서가 중요하다.**

```
1. 슬롯 유효성 재검증 (4장 1~4단계를 다시 계산)
2. INSERT booking (canceled_ref = 0)
   └ DuplicateKeyException → 409 SLOT_TAKEN, 롤백
3. 구글 캘린더 이벤트 생성 (attendee = guest_email)
   └ 실패 → 롤백. 503 CALENDAR_FAILED. 예약을 남기지 않는다
4. gcal_event_id UPDATE
5. 커밋
6. 커밋 후: 양측 확정 메일 발송
   └ 실패 → 예약은 유효. 슬랙 웹훅으로 담당자에게 알림. 재시도 안 함
```

3번이 트랜잭션 안에 있어야 한다. 캘린더에 없는 예약을 만들지 않는 것이 이 기능의 실패 정책이다.
6번은 트랜잭션 밖이다 (`@TransactionalEventListener(AFTER_COMMIT)`). 메일 실패로 예약을 되돌리지 않는다.

**취소(5·13번)**

```
1. canceled_at = now, canceled_ref = seq  UPDATE
2. gcal_event_id 로 캘린더 이벤트 삭제 (실패해도 취소는 유효, 슬랙 알림)
3. 커밋 후 양측 취소 메일
```

---

## 6. 파기 스케줄러

```java
@Scheduled(cron = "0 30 4 * * *")   // 매일 04:30 KST
```

```sql
UPDATE booking
   SET guest_name = NULL, guest_company = NULL, guest_email = NULL,
       guest_phone = NULL, memo = NULL
 WHERE start_at < DATE_SUB(NOW(), INTERVAL 3 MONTH)
   AND guest_email IS NOT NULL;
```

- 이 메서드가 파기 기능의 전부다. 쿼리 한 개, 클래스 한 개.
- 멱등하다. 여러 파드에서 동시에 돌아도, 몇 번을 재실행해도 결과가 같다. **실행 이력 테이블도 락도 두지 않는다.**
- `guest_email IS NOT NULL`이 재처리 대상을 거른다. 별도 `purged_at` 컬럼이 필요 없다.
- 인덱스도 두지 않는다. 담당자 5명 규모라 몇 년이 지나도 수천 행이고, 하루 한 번 풀스캔이 인덱스 유지비보다 싸다.

---

## 7. 작업 분해

| # | 작업 | 선행 | 산출물 |
|---|---|---|---|
| T1 | DDL + 엔티티·리포지토리 | — | 3장 스키마, JPA 매핑 |
| T2 | 예약 유형 CRUD API + 화면 ① ② | T1 | API 1~5 |
| T3 | 구글 OAuth 연동 + 토큰 저장·갱신 | T1 | API 6~8. **0장 준비물 필요** |
| T4 | 슬롯 계산 + 공개 조회 API | T1, T3 | API 9~10 |
| T5 | 예약 확정 트랜잭션 + 메일 + 슬랙 알림 | T4 | API 11 |
| T6 | 공개 예약 페이지 ③ + 완료 ④ | T4, T5 | 2단계 폼, 동의 UI |
| T7 | 취소 ⑤ + 담당자 취소 | T5 | API 12~13 |
| T8 | 실패 상태 3종 UI + 슬랙 웹훅 | T5 | 와이어프레임 "실패 상태" |
| T9 | 파기 스케줄러 | T1 | 6장 |

T2와 T3은 병렬 가능. T9는 T1 직후 아무 때나.

**T5까지 끝나면 예약이 동작한다.** T6~T8은 화면과 실패 처리다.

---

## 8. 테스트 체크리스트

인수 조건과 1:1로 대응한다. 통합 테스트로 확인한다.

- [ ] 운영시간·소요시간 조합별로 슬롯이 구간 시작점 기준으로 정렬된다 (10:15–11:45 / 30분 → 10:15·10:45·11:15)
- [ ] `blocked_dates`·리드타임·활성 예약·캘린더 busy가 각각 슬롯에서 제외된다
- [ ] busy 구간과 슬롯이 **경계만 접할 때는 제외되지 않는다** (11:00 종료 busy + 11:00 시작 슬롯 → 예약 가능)
- [ ] 같은 슬롯에 동시 요청 2건 → 1건 성공, 1건 409
- [ ] 예약 → 취소 → 같은 슬롯 재예약 → 다시 취소 → 재예약. 반복해도 계속 성공한다
- [ ] 캘린더 이벤트 생성이 실패하면 booking row가 남지 않는다
- [ ] 메일 발송이 실패해도 booking row와 캘린더 이벤트는 남는다
- [ ] 미팅 2시간 이내 취소 요청 → 409, 예약 유지
- [ ] 미래 활성 예약이 있는 예약 유형 삭제 → 409
- [ ] 토큰 철회 상태에서 9번이 `bookable: false`를 반환한다
- [ ] 파기 대상 예약의 게스트 5개 컬럼이 NULL이 되고 `page_id`·`start_at`은 남는다. 두 번 실행해도 결과가 같다
- [ ] 동의 체크 없이 11번 호출 → 400

---

## 9. 확정 전 남은 것

개발 착수는 막지 않는다. T6 전까지 정해지면 된다.

- 예약 페이지 브랜딩 수준 (로고만 vs 랜딩) — 디자인
- 개인정보 동의 문구 최종 문안 — 법무. 수집 항목·목적·3개월 보유는 확정

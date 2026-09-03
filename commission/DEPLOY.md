# 배포 절차서

**아직 아무것도 올라가 있지 않다.** 이 문서는 올릴 때 사람이 따라가는 순서다.
올리는 일은 사람이 한다 — `CLAUDE.md` 4장이 프로덕션 배포와 마이그레이션 적용을 AI 가 실행하는 것을 금지한다.

---

## 0. 먼저 읽을 것 — 지금은 공개하면 안 된다

**로그인이 없다.** 지금 "누구로 보고 있는가" 는 `demo_user` 쿠키 하나가 전부다.
공개 주소에 그대로 올리면 누구나 쿠키를 바꿔서 남이 될 수 있고, 그러면
남의 의뢰 내용(취향과 연락 수단)을 읽고, 대신 수락하고, 대신 물릴 수 있다.

그래서 **배포에서는 시연용 로그인이 기본으로 잠겨 있다** (`lib/session.ts`, `__tests__/session.test.ts`).
잠긴 상태에서 이 서비스는 —

- 메뉴판과 메뉴 상세는 **보인다**
- 의뢰 보내기·내 의뢰·수락·전달은 **안 된다** (로그인한 사람이 없으므로)

올리는 방법은 둘 중 하나뿐이다.

| | 방법 | 언제 |
|---|---|---|
| **A. 잠근 채로** | 아무것도 안 켠다. 메뉴판만 보이는 껍데기 | 디자인·문구를 사람들에게 보여 줄 때 |
| **B. 열되 주소를 막고** | `DEMO_LOGIN=on` **＋ Vercel Deployment Protection 켜기** | 팀 안에서 흐름을 끝까지 눌러 볼 때 |

**B 에서 Deployment Protection 을 안 켜면 개인정보가 열린다.** 둘은 한 몸이다.
카카오 로그인(`TASKS.md` [기능])이 붙기 전에는 진짜 공개가 없다.

---

## 1. Supabase 프로젝트

1. 프로젝트를 만든다. 리전은 **ap-northeast-2 (서울)**.
2. 데이터베이스 비밀번호를 안전한 곳에 둔다. 다시 못 본다.
3. **Connection string** 에서 **Transaction pooler (6543)** 를 복사한다.
   - Session pooler(5432)가 아니다. 서버리스는 연결을 짧게 자주 여닫는다.
   - 꼴: `postgresql://postgres.<project-ref>:<비밀번호>@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`

---

## 2. 마이그레이션 적용 — 순서가 중요하다

`supabase/migrations` 의 파일을 **이름순으로** 적용한다.

```
20260902000100_profiles_commissions.sql
20260902000200_requests.sql
20260902000300_request_functions.sql
20260902000400_lock_write_paths.sql
20260903000100_creator_trust.sql
20260903000200_withdraw_overdue.sql
```

**`supabase/local/bootstrap.sql` 은 적용하지 않는다.**
그 파일은 로컬 Postgres 에서 Supabase 를 흉내내려고 `auth.users` 테이블과
`anon`·`authenticated`·`service_role` 역할을 직접 만든다. Supabase 에는 이미 있다.
올리면 충돌하거나, 더 나쁘게는 진짜 인증 테이블을 덮는다.

**`supabase/local/seed.sql` 도 적용하지 않는다.** 시연용 가짜 사람 넷과 가짜 펀딩 숫자가 들어 있다.

적용 방법은 둘 다 된다.
- Supabase 대시보드 SQL Editor 에 파일 내용을 순서대로 붙여 넣기
- 또는 `psql "<연결 문자열>" -f supabase/migrations/<파일>` 을 순서대로

적용 뒤 확인:

```sql
select proname from pg_proc where proname in (
  'submit_request','accept_request','decline_request',
  'cancel_request','deliver_request','complete_request',
  'active_request_count','withdraw_grace_days'
) order by proname;   -- 8줄이 나와야 한다
```

---

## 3. Vercel

1. 이 저장소를 가져오되 **Root Directory 를 `commission` 으로** 지정한다 (모노레포다).
2. Framework 는 Next.js 자동 인식. 빌드 명령은 기본값 그대로.
3. 환경변수 (Production):

| 이름 | 값 | 비고 |
|---|---|---|
| `DATABASE_URL` | 1번의 Transaction pooler 문자열 | **필수** |
| `DEMO_LOGIN` | 안 넣음 (A안) / `on` (B안) | B안이면 4번을 반드시 함께 |
| `DB_POOL_MAX` | 안 넣음 (기본 3) | 연결이 모자라면 올린다 |

`POSTGRES_PASSWORD` 는 로컬 전용이다. 올리지 않는다.

---

## 4. 주소 막기 (B안일 때만, 그러나 B안이면 반드시)

Vercel → Settings → **Deployment Protection** → Vercel Authentication 또는 Password Protection 을 켠다.
켠 뒤 **로그아웃 상태의 다른 브라우저로 주소를 열어** 막히는지 눈으로 확인한다.

---

## 5. 올린 뒤 확인 목록

- [ ] 메뉴판(`/`)이 열리고 메뉴가 보인다 — 안 보이면 `DATABASE_URL` 이나 마이그레이션 문제
- [ ] 메뉴 상세가 열린다
- [ ] **A안**: `/me` 가 "로그인이 아직 없습니다" 를 보여 준다
- [ ] **B안**: 사용자를 고르면 바뀌고, 로그아웃한 다른 브라우저에서는 주소 자체가 막힌다
- [ ] 없는 주소(`/commissions/없는id`)가 "찾을 수 없는 페이지" 를 보여 준다
- [ ] 폭 390 에서 가로로 밀리지 않는다

---

## 6. 되돌리기

Vercel 의 이전 배포를 **Promote to Production** 하면 화면은 즉시 되돌아간다.
**데이터베이스는 되돌아가지 않는다.** 마이그레이션에는 내리는 스크립트가 없다.
그래서 2번을 실행하기 전에 Supabase 백업 시점을 확인해 둔다.

---

## 아직 못 하는 것

`TASKS.md` 의 [기능] 넷은 전부 밖에서 막혀 있다 — 카카오 로그인(Supabase Auth),
이미지 업로드(Storage), 알림(외부 API 키), 텀블벅 펀딩 실연동(텀블벅 DB 접근).
그중 **카카오 로그인이 붙기 전에는 진짜 공개가 없다** (0장).

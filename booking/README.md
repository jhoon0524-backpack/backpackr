# 미팅 예약 링크

영업 담당자가 예약 링크를 보내면 상대가 비어 있는 시간을 골라 확정하고, 확정 즉시 양쪽 캘린더에 일정이 들어간다.

기획은 [../docs/prd/meeting-scheduler.md](../docs/prd/meeting-scheduler.md), 구현 스펙은 [../docs/prd/handoff.md](../docs/prd/handoff.md), 동작 목업은 [../docs/prd/prototype.html](../docs/prd/prototype.html).

```
npm run dev      # 개발 서버
npm test         # 슬롯 계산·구글 호출·봉인 테스트
```

## 텀블벅과 독립으로 간다

원래 핸드오프는 텀블벅 서비스 안에 모듈로 넣는 전제로 쓰였다. 독립 서비스가 되면서 "기존 것을 재사용한다"로 지웠던 비용이 일부 되살아났다.

| 원래 | 지금 |
|---|---|
| 메일은 기존 알림 모듈 | 발송 경로를 직접 붙인다 |
| 담당자 인증은 기존 admin 세션 | **구글 OAuth 로그인** |
| refresh token 암호화는 기존 유틸 | 직접 구현 |
| tumblbug-ui 컴포넌트만, 신규 0개 | 제약 소멸 |

**인증은 오히려 싸졌다.** 구글 로그인이 곧 캘린더 연동이다 — 담당자가 구글로 로그인하면 그 계정이 연동 대상이라 계정·세션·비밀번호 관리가 통째로 사라진다. 어차피 캘린더 때문에 OAuth 를 붙이고 있었으니 추가 비용이 없다.

## 스택

- **Next.js 16 / React 19** — 공개 예약 페이지 SSR, 담당자 화면, API 라우트가 한 프로젝트에
- **Supabase Postgres** — 스키마는 `supabase/migrations/`
- **Vercel** — 배포. 개인정보 파기는 Vercel Cron 일 1회
- CSS 는 손으로 쓴다. 목업의 디자인 토큰을 그대로 옮기므로 유틸리티 프레임워크를 넣지 않는다

## 지금까지 된 것

`lib/slots.ts` — 슬롯 계산과 취소 가능 판별.

문서가 "여기서 어긋나면 이중 부킹이 난다"고 지목한 자리라 먼저 짰다. 규칙을 하나씩 건다 — 구간 시작점 정렬, 리드타임 4시간(경계 포함), 활성 예약과 캘린더 busy 겹침 제외(경계 접촉은 겹침 아님), 취소 시 슬롯 재개방, 예약 창 14일.

**시각은 전부 UTC epoch ms 로 다루고 KST 벽시계는 경계에서만 만든다.** 목업에서 `new Date()` 를 그대로 쓰다가 서버 타임존이 KST 가 아니면 슬롯이 달라지는 버그가 났다. 같은 실수를 막으려고 타임존 3개에서 결과가 같은지 확인하는 테스트를 넣었다.

`lib/google.ts` — 구글 캘린더 호출. `lib/crypto.ts` — refresh token 봉인.

**핸드오프의 호출 5개가 3개로 줄었다.** 동의 화면과 코드 교환은 Supabase Auth 가 한다 — 담당자 로그인이 곧 구글 OAuth 라 우리가 부를 자리가 없다. 남은 건 access token 갱신·freebusy·이벤트 생성·이벤트 삭제고, 응답에서 꺼내는 필드는 셋뿐이라 SDK 없이 `fetch` 로 부른다.

`TokenRevokedError` 를 따로 둔 이유는 **연동 끊김이 에러가 아니라 상태**여서다. 갱신이 `400 invalid_grant` 로 오면 공개 페이지가 `bookable: false` 를 내리고 안내 문구를 렌더해야 하는데, 다른 실패와 섞이면 그 분기를 못 만든다.

봉인 형식은 `iv(12) ‖ tag(16) ‖ 암호문`. `node:crypto` 가 AES-GCM 을 하므로 정할 게 형식뿐이다. 키가 바뀌면 복호가 실패하고 그 담당자는 재연동한다.

`lib/supabase.ts`·`lib/calendar.ts` + 로그인·콜백·해제 라우트 — API 6~8.

**로그인 한 번으로 연동까지 끝난다.** 구글로 로그인하면 그 계정이 곧 연동 대상이라 "로그인 먼저, 연동은 나중에" 라는 두 단계가 없다. 그래서 경로도 `/admin/api/calendar/connect` 가 아니라 `/auth/login` 이다.

콜백이 하는 일은 하나다 — **세션에 딸려 온 `provider_refresh_token` 을 붙잡아 봉인해 두는 것.** 이 토큰은 로그인 순간의 세션에만 실려 오고, 놓치면 다시 받을 방법이 재로그인뿐이다. 토큰이 안 왔는데 기존 연동도 없으면 성공으로 넘기지 않는다. 그대로 두면 로그인은 되는데 슬롯이 영영 안 나온다.

`connection()` 은 행이 있는지가 아니라 **토큰이 실제로 먹히는지**를 본다. 구글이 `invalid_grant` 로 거절하면 행을 지운다 — 남겨두면 화면에는 연동됨으로 보이는데 슬롯은 안 나오는, 담당자가 고칠 방법이 없는 상태가 된다.

세션 갱신은 `proxy.ts` 가 한다(Next 16 에서 middleware 가 proxy 로 바뀌었다). 서버 컴포넌트는 쿠키를 쓸 수 없어 갱신할 자리가 없고, 없으면 담당자가 임의로 로그아웃되는 형태로 나타난다. matcher 는 `/admin` 으로 좁혔다 — 공개 예약 페이지는 세션을 보지 않는다.

마이그레이션도 한 곳 고쳤다. `calendar_token.refresh_token` 이 `bytea` 가 아니라 `text` 다. PostgREST 로는 bytea 가 `\x` 헥사 문자열로 오가서 어차피 인코딩을 한 겹 거치므로, base64 문자열로 두고 인코딩을 `lib/crypto.ts` 한 군데에만 남긴다. 아직 어디에도 적용한 적 없는 마이그레이션이라 0002 를 더하지 않고 0001 을 고쳤다.

## 남은 것

- Supabase 프로젝트에 붙여서 **실제로 로그인이 되는지 확인** — 아래 전부 미검증이다
- 예약 유형 CRUD — API 1~5
- 공개 조회 API 9~10 (`bookable`, 슬롯)
- 예약 확정·취소 트랜잭션, unique 위반 → 409 — API 11~13
- 화면 5개 (담당자 목록·편집, 공개 예약·완료·취소) — `/admin` 은 로그인·연동 상태만 있는 껍데기다
- 확정·취소 메일, 실패 시 `sync_error` 기록
- 개인정보 파기 Cron

**지금까지의 테스트는 전부 단위 테스트다.** `fetch` 를 스텁으로 막고 확인한 것이라 구글 API 나 Supabase 에 한 번도 붙여본 적이 없다. handoff 8장 체크리스트는 통합 테스트를 요구하는데, 그건 준비물이 생긴 뒤에야 가능하다.

## 준비물

- GCP 프로젝트 + OAuth 클라이언트 — 발급 절차는 handoff 0장. **리디렉션 URI 는 Supabase 콜백(`{supabase-url}/auth/v1/callback`)이다.** 로그인을 Supabase Auth 가 받으므로 우리 도메인이 아니다
- Supabase 프로젝트 — Authentication → Google 제공자에 위 클라이언트 ID·시크릿을 넣는다
- 메일 발신 주소 1개

**환경 변수**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY # 모든 데이터 접근이 이 키로만 된다. RLS 를 켜고 정책을 두지 않았다
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET      # access token 갱신에 쓴다. Supabase 에 넣는 것과 같은 값
TOKEN_ENC_KEY             # refresh token 봉인 키. openssl rand -base64 32
BOOKING_BASE_URL
MAIL_FROM
MAIL_ADMIN_TO
```

`GOOGLE_REDIRECT_URI` 는 없다 — 우리가 코드 교환을 하지 않는다.

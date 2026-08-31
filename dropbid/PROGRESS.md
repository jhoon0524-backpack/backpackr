# 현재 진행 상황

## 최근 완료한 작업
- [데이터] 마감 처리 DB 함수 + 멱등 테스트 9개 (`close_due_auctions`) — 전체 44개 통과
  - **PRD 인수 조건 두 개를 고정했다.** 두 번 연속 실행해도 낙찰 1회, 입찰 0건이면 unsold
  - 낙찰과 동시에 결제 기한 24시간짜리 주문을 같은 트랜잭션에서 만든다
  - `for update skip locked` 라 스케줄러가 겹쳐 돌아도 같은 경매를 두 번 잡지 않는다.
    동시 실행 테스트로 주문이 하나만 생기는 것도 확인했다
  - 처리 결과를 행으로 돌려준다. 스케줄러가 실행·처리 건수를 기록할 수 있다 (PRD 인수 조건)
  - 상태 조건을 일부러 풀어서 멱등 테스트 3개가 정확히 실패하는 것을 확인했다
  - 만드는 중 두 가지를 고쳤다: 반환 컬럼명이 `orders.auction_id` 와 충돌한 것(`#variable_conflict use_column`),
    헬퍼가 회차 번호를 1 로 고정해 한 테스트에서 경매를 여러 개 못 만들던 것
- [데이터] `place_bid` 동시성 테스트 3개 (`__tests__/db/place_bid_concurrency.test.ts`) — 전체 35개 통과
  - **PRD 인수 조건이 이제 `npm test` 에 고정됐다.** 100명 동시 입찰 → 성공 1건, 거부 99건, 최고입찰자 1명.
    릴리즈 1단계의 롤백 조건이 바로 이 항목이다
  - 커넥션 풀이 25개라 DB 에 동시에 닿는 것은 최대 25건이다. 100 커넥션을 한꺼번에 여는 것은
    Postgres 기본 `max_connections` 100 을 넘겨 테스트가 불안정해진다.
    확인하려는 것은 부하가 아니라 잠금의 직렬화라 이 경합으로 충분하다 (테스트 주석에도 적어둠)
  - `FOR UPDATE` 를 일부러 빼고 돌려서 동시성 테스트 3개가 정확히 실패하는 것을 확인했다
  - 테스트를 쓰다 헬퍼에서 `place_bid` 를 한 SQL 문에서 두 번 호출하는 실수를 발견해 CTE 로 고쳤다.
    그대로 뒀으면 입찰이 두 번 들어가 테스트가 거짓으로 통과했을 것이다
- [데이터] `place_bid` 단위 테스트 15개 (`__tests__/db/place_bid.test.ts`) — 전체 32개 통과
  - 거부 4종, 마감 지난 live 거부, 첫 입찰=시작가, 인상폭 구간 4개, 현재가·최고입찰자 갱신,
    30초 연장, 연장 없음, 연장 상한 20회. 거부 기록이 사유 코드와 함께 남는 것도 고정했다
  - **두 번째 DB 테스트 파일이 생기자 하네스 결함이 드러났다.** 파일이 병렬로 돌면서
    `resetDb()` 두 개가 동시에 스키마를 만들다 충돌했고, `truncateAll()` 도 서로의 데이터를 지웠다.
    `fileParallelism: false` 로 파일을 순서대로 돌린다. 스위트가 커지면 파일마다 별도 DB 를 줘야 한다
  - 연장 상한을 일부러 없애고 돌려서 해당 테스트만 빨간불이 되는 것을 확인했다
- [데이터] DB 테스트 하네스 셋업 + 스키마 제약 테스트 17개 (`__tests__/db/`)
  - `pg` 로 붙는다. 마이그레이션 적용도 테스트가 직접 한다 — psql 에 의존하지 않아 CI 에서도 그대로 돈다
  - 하네스도 `reset.sh` 와 같은 안전장치를 갖는다. `DATABASE_URL` 이 로컬이 아니면 아예 붙지 않는다
  - DB 테스트는 `// @vitest-environment node` 로 node 환경에서 돈다 (기본은 jsdom)
  - **CI 에 Postgres 16 서비스를 붙였다.** 이제 매 푸시마다 스키마 제약이 진짜 DB 로 확인된다
  - **테스트가 진짜 감시하는지 확인했다.** 사진 3장 제약을 일부러 지우고 돌려서 해당 테스트만
    빨간불이 되는 것을 보고 원상복구했다. 초록불을 믿기 전에 빨간불을 한 번 봐야 한다
- [데이터] `place_bid` DB 함수 작성 — `supabase/migrations/20260831130838_place_bid.sql`
  - 인상폭은 `bid_increment(price)` 로 분리했다. 화면도 같은 값을 보여줘야 하기 때문
  - 거부도 `bids` 에 기록해야 해서 예외를 던지지 않고 결과 jsonb 를 돌려준다.
    예외를 던지면 그 기록까지 롤백된다
  - 화면이 필요한 것을 함께 돌려준다: `current_price`, `min_next_amount`, `ends_at`, `extended`
  - **PRD 인수 조건을 실제로 통과시켰다.** 현재가 10,000원 경매에 서로 다른 100명이 동시에 11,000원 입찰 →
    성공 1건, 거부 99건(전부 `amount_too_low`), 최고입찰자 1명
  - 마감 5초 전 입찰 → 정확히 30초 연장 확인. 연장 20회 도달 후 → 입찰은 받고 연장은 안 함 확인
  - PRD 에 없지만 넣은 판단 두 가지는 아래 "다음 사람이 헷갈릴 만한 것" 참고
- [데이터] 마이그레이션 프로덕션 적용 절차 확정 — `README.md` "마이그레이션을 프로덕션에 적용하기"
  - 원래 항목명은 "마이그레이션 파일 작성" 이었으나 파일은 스키마 작업에서 이미 다 나왔다.
    남은 실체는 "사람이 어떻게 적용하는가" 라서 그것으로 읽고 진행했다
  - 빈 DB 에 auth 스키마만 있는 상태(프로덕션과 같은 조건)에서 마이그레이션 3개가
    순서대로 적용되어 7개 테이블이 생기는 것을 별도 DB 로 확인했다
  - Supabase 마이그레이션은 자동 롤백이 없다는 점을 절차에 명시했다
- [데이터] 스키마 정의 3 — `bids`, `orders`, `notifications`
  - `supabase/migrations/20260831130406_bids_orders_notifications.sql`
  - `bids` 는 거부된 시도까지 전부 남긴다. 사유 코드 4종을 enum 처럼 check 로 고정했고,
    `place_bid` 의 거부 순서와 1:1 로 맞춘다. 성립률 지표도 이 테이블에서 뽑는다
  - **알림 멱등을 스키마가 강제한다.** `(auction_id, user_id, kind, channel)` 유니크 인덱스라
    스케줄러가 두 번 돌아도 같은 알림이 두 번 안 들어간다. 알림톡 실패 후 이메일 폴백은 channel 이 달라 통과
  - `orders` 는 경매당 하나(unique). 결제 수단 정보는 저장하지 않고 포트원 거래 식별자만 갖는다
  - 계정 삭제 후 `bids` / `orders` 기록이 남고 사람 칸만 비는 것을 실제로 확인했다 (PRD 엣지케이스)
  - 제약 10가지를 로컬 DB 에 직접 넣어보며 확인
- [데이터] 스키마 정의 2 — `drops`, `auctions`
  - `supabase/migrations/20260831130052_drops_auctions.sql`
  - 마감 시각을 회차(`drops.ends_at`)와 경매(`auctions.ends_at`) 양쪽에 둔다.
    회차 값으로 초기화하고, 마감 임박 입찰이 들어오면 경매 쪽만 뒤로 밀린다
  - 연장 상한은 `check (extension_count between 0 and 20)` 으로 스키마가 강제한다
  - 낙찰이면 낙찰자가 있어야 하고 유찰이면 없어야 한다는 것도 제약으로 넣었다
  - `highest_bidder_id` / `winner_id` 는 `on delete set null`. 계정을 지워도 경매 기록은 남는다
  - 제약 7가지를 로컬 DB 에 직접 넣어보며 확인 (거부 6건 + 정상 생성 1건, 기본값 scheduled/0회)
- [데이터] 스키마 정의 1 — `profiles`, `products`
  - `supabase/migrations/20260831125721_profiles_products.sql`
  - PRD 규칙을 앱이 아니라 스키마가 강제하게 했다. 후원 인증은 `not null` 자체가 "없으면 등록 거부" 규칙이고,
    사진 3장·시작가 1,000원·반려 사유는 check 제약으로 넣었다
  - 마이그레이션이 `auth.users` 를 참조하는데 로컬 Postgres 에는 없다.
    `supabase/local/bootstrap.sql` 로 최소한만 흉내내고, `npm run db:reset` 으로 초기화·적용을 반복 가능하게 했다
  - `reset.sh` 는 public 스키마를 통째로 지우므로 대상이 로컬이 아니면 멈춘다 (CLAUDE.md 4장).
    원격처럼 보이는 주소로 실제 거부되는지 확인함
  - 제약 5가지를 로컬 DB 에 직접 넣어보며 확인했다 (거부 4건 + 정상 등록 1건, 기본 status=pending)
- [기반] 환경변수 골격 정리 — `.env.example` (자리만, 값 없음)
  - `.gitignore` 의 `.env*` 가 예시 파일까지 막아서 `!.env.example` 예외를 넣었다
  - `.env.local` / `.env.production` 을 실제로 만들어 git 이 무시하는지, 예시는 추적되는지 확인 후 삭제
- [기반] Supabase 로컬 개발 환경 셋업 — **절반만 됐다**
  - `supabase init` 완료 (`supabase/config.toml`). CLI 는 devDependency 로 설치
  - **`supabase start` 는 이 환경에서 불가능하다.** Docker 데몬은 띄웠지만 이미지를 받을 수 없다.
    `production.cloudfront.docker.com` 이 네트워크 정책에서 403(CONNECT 거부)으로 막혀 있다.
    프록시 README 가 "우회하지 말고 보고하라"고 한 부류라 우회하지 않았다
  - 대신 로컬 Postgres 16 을 띄워 개발용 DB 를 만들었다 (`dropbid_dev`). 접속 확인함
  - 재현 절차는 `README.md` 에 적었고, 적은 그대로 실행해 확인했다
- [기반] CI 설정 — 푸시할 때 검증 명령 3개 자동 실행
  - `.github/workflows/dropbid.yml` (저장소 루트). Node 22, `npm ci` 후 세 명령 순서대로
  - 이 저장소에는 MyAIGame·agent-starter·booking·docs 도 있어서 `dropbid/**` 변경일 때만 돌게 경로 필터를 걸었다
  - 로컬에서 `node_modules` 를 지우고 `npm ci` 부터 전체 시퀀스를 재현해 통과 확인 (락파일 완전성까지 확인됨)
  - **첫 CI 실행은 실패했다.** `npx tsc --noEmit` 이 `app/layout.tsx` 의 `LayoutProps` 를 못 찾음.
    Next 16 이 `.next/types/` 에 생성하는 전역 타입인데 `.next` 는 git 에 없다.
    로컬 재현이 통과했던 건 스캐폴드가 만들어둔 `.next` 가 남아 있었기 때문 (`node_modules` 만 지웠다).
    검증 명령을 `npm run typecheck` (= `next typegen && tsc --noEmit`) 로 바꿔 어디서든 자립하게 했다.
    `.next` 까지 지운 상태로 재현·수정·재확인함. CLAUDE.md 3장과 [규칙 목록] 에도 반영
  - 수정 후 CI 초록불 확인 (`f8345df`)
- [기반] 검증 명령 3개가 빈 프로젝트에서 통과하는지 확인 (테스트 러너 셋업)
  - Vitest + jsdom + Testing Library. `vitest.config.mts`, 스모크 테스트 1개(`__tests__/smoke.test.tsx`)
  - `npm test` 는 `vitest run` 으로 둔다. Next 문서는 `vitest` 를 쓰라고 하지만 그건 watch 모드라
    검증 명령과 CI 에서 멈춘다. watch 가 필요하면 `npm run test:watch`
  - `vite-tsconfig-paths` 는 설치했다가 제거했다. Vite 가 네이티브로 지원해서
    `resolve.tsconfigPaths: true` 로 대체 (Vite 가 직접 경고로 알려줌). `@/` 해석 실제로 확인함
  - 세 명령 모두 통과 확인
- [기반] Next.js(App Router) + TypeScript + Tailwind 프로젝트 생성 및 의존성 설치
  - create-next-app 최신 버전으로 생성 (ESLint 포함, npm, src 디렉터리 없음, `@/*` 별칭)
  - `npm run lint` / `npx tsc --noEmit` 통과 확인. `npm test` 는 러너 미설치로 건너뜀 (다음 작업)
  - 스캐폴드가 만든 `AGENTS.md` 를 남겨둠 — 설치된 Next.js 가 학습 데이터와 다를 수 있으니
    `node_modules/next/dist/docs/` 문서를 먼저 읽으라는 내용. 코드 작성 작업 전에 참고할 것

## 다음에 진행할 작업
- [데이터] DB 권한 설정 — 앱 역할에서 `bids`/`auctions` 직접 쓰기 REVOKE

[기반] 단계는 `supabase start` 확인만 남기고 끝났다. 그건 Docker 가 되는 환경에서 해야 한다.

## 확인하지 못한 것
여기가 이 문서에서 가장 중요하다.
확인 안 한 것을 완료로 적으면 다음 세션이 그 위에 쌓는다.
- `npm run dev` / `npm run build` 는 아직 안 돌려봤다
- **Auth·Storage·Realtime 은 이 환경에서 한 번도 안 돌려봤다.** Docker 가 되는 환경에서 확인해야 한다.
  이 셋에 의존하는 작업([기능]의 카카오 로그인·이미지 업로드, [화면]의 Realtime 갱신)은
  여기서 완료로 표시하면 안 된다
- PRD 인수 조건 9개 중 입찰 관련 3개(동시 입찰, 30초 연장, 후원 인증 누락 거부)는 테스트로 고정됐다.
  나머지(마감 멱등, 유찰 알림, 결제 기한 만료, 직접 쓰기 차단, 스케줄러 기록)는 아직이다
- "마감 시각이 이미 지난 상태로 배정 → 배정 거부" (PRD 엣지케이스)는 스키마로 못 막았다.
  `now()` 가 immutable 이 아니라 check 제약에 못 쓴다. 배정 API 나 DB 함수에서 막아야 한다
- 계정 삭제 시 입찰 보존은 아직 설계만 있다. `profiles` 는 `auth.users` 를 `on delete cascade` 로 참조하므로,
  입찰 기록을 남기려면 `bids` 쪽에서 `on delete set null` 로 받아야 한다 (스키마 정의 3 에서 결정할 것)
- 로컬 Postgres 는 16, `supabase/config.toml` 은 17 이다. 버전 차이에 의존하는 기능을 쓰면
  Supabase 스택에서 다시 확인할 것
- 서버 컴포넌트(async)는 Vitest 가 지원하지 않는다. Next 문서 권고는 E2E.
  현재 스모크 테스트는 도구 사슬 확인용이라 이 제약에 걸리지 않았다
- 카카오 로그인·알림톡, 포트원 모두 계정·심사·템플릿 승인이 안 된 상태다

## 알고 있는 문제
- [개발 블로커] 겸업·이해충돌 정리 — 1단계 착수 전 회사와 정리 필요. 결과에 따라 카테고리·서비스 성격이 바뀔 수 있다 (PRD 논의사항)
- [개발 블로커] 통신판매중개업 신고, PG 가맹점 심사 — 심사 통과가 릴리즈 2단계 선행 조건
- 시작 카테고리 미정 (웹툰·일러스트 굿즈 vs 보드게임·TRPG) — 데이터 확인 후 결정

## 다음 사람이 헷갈릴 만한 것
- 연장 상한 20회는 **경매당**이다 (사용자 확인함). PRD 원문이 "회차당" 이라 잘못 쓰여 있던 것을 고쳤다
- `place_bid` 에서 PRD 에 없지만 판단해서 넣은 것 두 가지:
  1. **첫 입찰은 시작가 그대로 받는다.** PRD 는 "현재가 + 최소 인상폭" 만 적었는데, 그대로 하면
     첫 입찰자가 시작가보다 무조건 더 내야 해서 시작가가 의미를 잃는다.
     입찰 유무는 `highest_bidder_id` 가 아니라 `bids` 로 판단한다 — 최고입찰자가 계정을 지우면 null 이 되기 때문
  2. **마감 시각이 지났으면 status 가 아직 `live` 여도 거부한다.** 스케줄러가 1분 주기라
     마감 직후 몇십 초는 `live` 로 남는다. 이걸 안 막으면 끝난 경매가 입찰로 되살아난다
- `place_bid` 는 `user_id` 를 인자로 받는다. **브라우저에서 직접 호출하면 남의 이름으로 입찰할 수 있다.**
  서버 라우트만 호출하도록 권한을 잠그는 것이 [데이터] 의 "DB 권한 설정" 항목이다. 그 전까지는 노출하지 말 것
- 연락처 미등록 입찰 차단은 `place_bid` 에 아직 없다. [기능] 의 연락처 가드 항목에서 넣는다.
  API 가 아니라 이 함수에 넣어야 한다 — 입찰의 유일한 통로가 여기이기 때문
- 입찰 로직은 애플리케이션이 아니라 Postgres 함수(`place_bid`)에 있다. 앱 코드에서 `bids`/`auctions` 직접 쓰기는 금지 (CLAUDE.md 규칙 목록 참고)
- 이 요약과 `PRD.md` 가 어긋나면 `PRD.md` 가 원본이다

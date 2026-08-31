# 현재 진행 상황

## 최근 완료한 작업
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
- [데이터] 마이그레이션 파일 작성 (실행은 사람이) — 스키마 3개는 이미 파일로 있으므로
  이 항목은 "프로덕션 적용 절차를 문서로 확정한다" 로 읽는다

[기반] 단계는 `supabase start` 확인만 남기고 끝났다. 그건 Docker 가 되는 환경에서 해야 한다.

## 확인하지 못한 것
여기가 이 문서에서 가장 중요하다.
확인 안 한 것을 완료로 적으면 다음 세션이 그 위에 쌓는다.
- `npm run dev` / `npm run build` 는 아직 안 돌려봤다
- **Auth·Storage·Realtime 은 이 환경에서 한 번도 안 돌려봤다.** Docker 가 되는 환경에서 확인해야 한다.
  이 셋에 의존하는 작업([기능]의 카카오 로그인·이미지 업로드, [화면]의 Realtime 갱신)은
  여기서 완료로 표시하면 안 된다
- 스키마 제약은 수동으로만 확인했다. 자동 테스트로 고정되어 있지 않다 (TASKS 의 "DB 테스트 하네스" 항목)
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
- 입찰 로직은 애플리케이션이 아니라 Postgres 함수(`place_bid`)에 있다. 앱 코드에서 `bids`/`auctions` 직접 쓰기는 금지 (CLAUDE.md 규칙 목록 참고)
- 이 요약과 `PRD.md` 가 어긋나면 `PRD.md` 가 원본이다

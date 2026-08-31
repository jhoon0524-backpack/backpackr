# 현재 진행 상황

## 최근 완료한 작업
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
- [기반] Supabase 로컬 개발 환경 셋업 (`supabase init` + `supabase start`, 접속 확인)

## 확인하지 못한 것
여기가 이 문서에서 가장 중요하다.
확인 안 한 것을 완료로 적으면 다음 세션이 그 위에 쌓는다.
- `npm run dev` / `npm run build` 는 아직 안 돌려봤다
- 서버 컴포넌트(async)는 Vitest 가 지원하지 않는다. Next 문서 권고는 E2E.
  현재 스모크 테스트는 도구 사슬 확인용이라 이 제약에 걸리지 않았다
- 카카오 로그인·알림톡, 포트원 모두 계정·심사·템플릿 승인이 안 된 상태다

## 알고 있는 문제
- [개발 블로커] 겸업·이해충돌 정리 — 1단계 착수 전 회사와 정리 필요. 결과에 따라 카테고리·서비스 성격이 바뀔 수 있다 (PRD 논의사항)
- [개발 블로커] 통신판매중개업 신고, PG 가맹점 심사 — 심사 통과가 릴리즈 2단계 선행 조건
- 시작 카테고리 미정 (웹툰·일러스트 굿즈 vs 보드게임·TRPG) — 데이터 확인 후 결정

## 다음 사람이 헷갈릴 만한 것
- 입찰 로직은 애플리케이션이 아니라 Postgres 함수(`place_bid`)에 있다. 앱 코드에서 `bids`/`auctions` 직접 쓰기는 금지 (CLAUDE.md 규칙 목록 참고)
- 이 요약과 `PRD.md` 가 어긋나면 `PRD.md` 가 원본이다

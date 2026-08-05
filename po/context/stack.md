# 기술 스택 컨텍스트

소유자: BE/FE 리드. 스택 변경 시 이 파일만 고친다.
조직 정보는 `org.md` 소관이다.
서비스 정책(수수료·상태머신·계산식)은 여기 두지 않는다 — Notion이 SSOT다.
최종 확인: 2026-08-02

## 기술 스택
- BE: Java 17, Spring Boot 2.7, Gradle 멀티모듈(core/api/admin/gateway/batch)
  MySQL + JPA/QueryDSL, Redis/Redisson, RabbitMQ, Quartz, AWS(S3/SNS), Algolia
- FE: Next.js 13.5 / React 18.3, TypeScript 5.2, Tailwind CSS + tumblbug-ui
  Zustand, TanStack Query, React Hook Form + Zod, pnpm + Turborepo 모노레포
- Android: Kotlin, Jetpack Compose + View 혼용, Hilt, Retrofit, Room, Firebase
- iOS: Swift 5.0, UIKit + SwiftUI 점진 도입, RxSwift, Alamofire
- 배포: AWS EKS(BE) / Docker + GitHub Actions(FE) / Fastlane(앱)
- 모니터링: Datadog(BE) / Sentry(FE)

## 관리 도메인
- 어드민: `oneteam.tumblbug.com`
- 사용자향: `tumblbug.com`

## 기능 성격 → 명시해야 할 수단

기획한 기능이 아래 성격에 해당하면 어느 수단을 쓰는지 PRD에 적는다.
적지 않으면 개발이 각자 다르게 해석하거나 새 의존성을 들여온다.

| 기능 성격 | 우리가 쓰는 수단 |
|---|---|
| 주기적 배치 처리 | Quartz 또는 `batch` 모듈 |
| 비동기 · 실시간 처리 | RabbitMQ 또는 Redis |
| 검색 | Algolia |
| 알림 발송 | AWS SNS |
| 새 화면 (FE) | tumblbug-ui 디자인 토큰 범위 내. 벗어나면 신규 컴포넌트 → 의존성에 명시 |
| 새 화면 (iOS) | UIKit / SwiftUI 중 어느 쪽인지 명시 (혼용 상태) |
| 새 화면 (Android) | Compose / View 중 어느 쪽인지 명시 (혼용 상태) |
| 앱 기능 | iOS·Android 동시 구현 여부 명시 |

렌더링은 화면 성격에 따라 판단한다. 외부 노출·SEO가 걸리면 SSR, 로그인 후 대시보드류면 CSR.

## 구현 최소화 사다리

무언가를 만들기 전에 위에서부터 내려온다. 걸리는 첫 단에서 멈춘다.

```
1. 이게 존재해야 하는가?      → 아니면 안 만든다
2. 이 코드베이스에 있는가?     → 재사용한다, 다시 쓰지 않는다
3. 표준 라이브러리가 하는가?    → 쓴다
4. 플랫폼 기본 기능인가?       → 쓴다
5. 이미 깔린 의존성이 하는가?   → 쓴다
6. 한 줄인가?                → 한 줄로 쓴다
7. 그제서야: 동작하는 최소한
```

적용 예시는 `docs/prd/handoff.md`의 결정표를 본다.

## 스킬이 이 파일을 쓰는 방식
- 기술 스택 검증: 신규 기능이 어느 모듈·라이브러리를 쓰는지 판단할 때

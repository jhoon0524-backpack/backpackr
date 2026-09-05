# 텀블벅 프로젝트 구조

텀블벅 크라우드펀딩 서비스를 구성하는 repo 정의. 코드 호스팅은 GitHub `tumblbug` org.

> ⚠️ **로컬 경로 설정**: 코드 분석 시 `docs/local-paths.md`를 본인 환경에 맞게 작성. 템플릿: `docs/local-paths.md.template`. `sources/` 하위 심링크로 접근.

---

## 1. 백엔드 (Backend)

| 이름 | 플랫폼 | GitHub repo | 브랜치 | sources/ | 설명 |
|---|---|---|---|---|---|
| be-api | Java/Spring | [tumblbug-api-v2](https://github.com/tumblbug/tumblbug-api-v2) | master | `be-api` | 텀블벅 핵심 API. Gradle 멀티모듈. 자체 CLAUDE.md/AGENTS.md/docs 보유 |
| ~~be-api-legacy~~ | ~~Java~~ | ~~tumblbug-api-legacy~~ | — | — | **제외 (분석·심링크 대상 아님)** |

### be-api (tumblbug-api-v2) 멀티모듈

| 모듈 | 역할 |
|---|---|
| `api` | 후원자/창작자향 API 엔드포인트 |
| `admin` | 어드민/운영 API |
| `batch` | 배치 (정산·상태 전이·집계 등) |
| `core` | 도메인 모델·비즈니스 로직 공통 |
| `gateway` | 게이트웨이/라우팅 |

> 정확한 모듈 경계·의존은 Phase 2 코드 대조 시 `sources/be-api`에서 확정.

---

## 2. 클라이언트 (Client)

| 이름 | 플랫폼 | GitHub repo | 브랜치 | sources/ | 설명 |
|---|---|---|---|---|---|
| android | Android (Kotlin) | [tumblbug-aos](https://github.com/tumblbug/tumblbug-aos) | features | `android` | 안드로이드 앱 |
| ios | iOS (Swift) | [tumblbug-ios](https://github.com/tumblbug/tumblbug-ios) | features | `ios` | iOS 앱 |
| fe | Web (TS) | [tbb-frontend](https://github.com/tumblbug/tbb-frontend) | main | `fe` | 프론트엔드 웹 |
| fe-admin | Web (TS) | [tbb-fe-admin](https://github.com/tumblbug/tbb-fe-admin) | main | `fe-admin` | 어드민 프론트엔드 |

---

## 참조

- GitHub org: https://github.com/tumblbug
- 노션 정책 SSOT: "🔑 텀블벅 서비스 정책" (`f851d23d81b1410081c20d0454efb831`)
- 코드 진입점: `docs/code-map.md` (기능→repo→코드경로 역색인)

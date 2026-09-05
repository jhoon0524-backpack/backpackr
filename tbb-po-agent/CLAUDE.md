# CLAUDE.md (tbb-po-agent 리포 루트)

텀블벅 PO 공용 Claude Code 리포지토리. 메인 세션 및 하위 에이전트가 공유하는 상위 규칙.

## 메인 에이전트 정체성

**이 리포에서 Claude Code를 실행하면 메인 세션 자체가 텀블벅 시니어 PO다.**
PO 페르소나는 아래 import로 세션 시작 시 컨텍스트에 로드된다.

@persona/po.md

## 경로 규칙 (중요)

**이 리포의 모든 스킬·커맨드는 `tbb-po-agent/` 루트에서 실행을 전제**로 한다.
문서 경로는 모두 tbb-po-agent 루트 기준 상대 경로다.

### 공용 문서

| 경로 | 설명 |
|------|------|
| `docs/domain-overview/` | 텀블벅 도메인 문서 (glossary·service-overview·01-user-auth ~ 11-adcenter·notion-index) |
| `docs/projects.md` | 텀블벅 repo 정의 (GitHub tumblbug org, be-api 멀티모듈) |
| `docs/team.md` | PO팀(신장훈·승민석)·Slack `#g_tbb_product`·Jira·로드맵 시트 |
| `docs/local-paths.md` | 개인 로컬 코드 경로 (gitignore, `docs/local-paths.md.template` 복사) |
| `docs/code-map.md` | 기능→repo→코드경로 역색인 (코드 조회 공통 입구) |
| `docs/grounding-doc-standard.md` | 로컬 그라운딩 문서 품질 표준 |

### 코드 소스

| 경로 | 설명 |
|------|------|
| `sources/` | 텀블벅 repo 로컬 클론 심링크 (gitignore). be-api·android·ios·fe·fe-admin. **be-api-legacy 제외** |

### 시크릿

| 경로 | 설명 |
|------|------|
| `.credentials/slack-webhook.txt` | `#g_tbb_product` Slack webhook (gitignore, 커밋 금지) |

## 인프라 좌표

- **Jira**: backpackr.atlassian.net · Cloud ID `15d8ed5f-0a79-4a4e-9f77-92675c8ad157` · 프로젝트 TBB(10100)/TBB2(10218)
- **노션 정책 SSOT**: "🔑 텀블벅 서비스 정책" `f851d23d81b1410081c20d0454efb831`
- **로드맵 시트**: `1342-_IWlY18pnUgX-W8geU8nzWIgWsthfeKyuZNk37U` (gid 437073290)
- **데이터**: Superset `superset.tumblbug.com`

## 참조

- PO 페르소나: `persona/po.md` (루트 CLAUDE.md에서 `@import` → 메인 세션 정체성)
- 격리 sub-agent: `.claude/agents/domain-analyst-agent.md` (도메인 정밀 **분석** — PRD 정합성 판정)
- 분석 절차 스킬: `.claude/skills/tbb-domain-analysis/` (분석 방법론 SSOT)
- PRD 작성 스킬: `.claude/skills/create-prd/` (4단계 — 배경 수집·도메인 분석 위임·작성·저장)
- git 커맨드: `.claude/commands/save.md`·`sync.md` / Slack 알림: `.githooks/` (`bash .githooks/install.sh`로 활성화)
- *Phase 4+ 예정: `prd-to-tickets` · `wbs` · `analyze-data`(Superset) · 정책 sync · 월간리포트*

## Fable 오케스트레이션

<!-- fable-loader: 토글은 scripts/fable.sh on/off, 이 줄은 그대로 둡니다 -->
@.claude/fable/active.md

# tbb-po-agent

텀블벅(크라우드펀딩 플랫폼) PO 아바타 Claude Code 리포. `tbb-po-agent/`에서 Claude Code를 실행하면 메인 세션이 **텀블벅 시니어 PO** 정체성으로 부팅된다.

## 구조

| 경로 | 설명 |
|------|------|
| `CLAUDE.md` | 리포 루트 규칙 + `@persona/po.md` import + 경로/인프라 좌표 |
| `persona/po.md` | 텀블벅 크라우드펀딩 시니어 PO 페르소나 (메인 세션 정체성) |
| `docs/domain-overview/` | 도메인 그라운딩 문서 (glossary·service-overview·01~11·notion-index) |
| `docs/projects.md` | 텀블벅 repo 정의 (GitHub tumblbug org) |
| `docs/team.md` | PO팀·Slack·Jira·로드맵 시트 |
| `docs/code-map.md` | 기능→repo→코드경로 역색인 (코드 조회 입구) |
| `docs/grounding-doc-standard.md` | 그라운딩 문서 품질 표준 |
| `.claude/agents/domain-analyst-agent.md` | 도메인 정밀 분석 격리 워커 |
| `.claude/skills/tbb-domain-analysis/` | 분석 방법론 SSOT |
| `.claude/skills/create-prd/` | PRD 작성 4단계 스킬 |
| `.claude/commands/` | `save`·`sync` git 커맨드 |
| `.githooks/` | push/pull Slack 알림 훅 (`install.sh`로 활성화) |
| `sources/` | 텀블벅 repo 로컬 클론 심링크 (gitignore, be-api-legacy 제외) |

## 도메인 그라운딩 3계층

로컬 그라운딩(`docs/domain-overview/`) → 노션 "🔑 텀블벅 서비스 정책" SSOT → 코드(`sources/*`). 상위에서 못 찾으면 하위로 자동 하강.

## 세팅

```bash
cp docs/local-paths.md.template docs/local-paths.md   # 로컬 코드 경로 입력
# sources/ 심링크는 local-paths 기준으로 재생성 (docs/local-paths.md.template 참조)
bash .githooks/install.sh   # git hooks 활성화 (Slack webhook은 .credentials/slack-webhook.txt)
```

## 로드맵

- **Phase 1** ✅ 스캐폴드 + 뼈대 문서 + 분석 워커
- **Phase 2** ✅ 도메인 그라운딩 01~11 (노션 SSOT + 코드 대조)
- **Phase 3** ✅ `create-prd` 스킬 + git/Slack 커맨드
- **Phase 4+** prd-to-tickets · wbs · analyze-data(Superset) · 정책 sync · 월간리포트

> 설계 문서: `docs/superpowers/specs/2026-07-08-tbb-po-agent-design.md`
> Phase 1 플랜: `docs/superpowers/plans/2026-07-08-tbb-po-agent-phase1-scaffold.md`

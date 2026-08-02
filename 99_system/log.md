# Log

append-only. 아래로 덧붙인다. 기존 항목은 고치거나 지우지 않는다.

형식: `## [YYYY-MM-DD] op | 제목`  (op: `ingest` | `query` | `lint`)

## [2026-08-01] setup | 위키 초기화

- `CLAUDE.md` 위키 스키마로 교체, 기존 코딩 가이드라인과 `docs/` 제거
- `00_raw/`, `00_raw/assets/`, `wiki/`, `99_system/` 생성
- `.claude/commands/`에 `ingest.md`, `query.md`, `lint.md` 작성

## [2026-08-01] ingest | LLM Wiki (Karpathy gist)

- 생성: [[LLM 위키]], [[RAG]], [[Memex]], [[Andrej Karpathy]], [[Obsidian]], [[Karpathy LLM Wiki gist]]
- 수정: 없음 (첫 인제스트, 위키가 비어 있었음)
- 결정: `qmd`, `Marp`, `Dataview`, Obsidian Web Clipper는 근거가 한두 문장뿐이라 독립 페이지로 만들지 않고 [[Obsidian]]과 [[LLM 위키]] 안에 넣었다.
- 결정: [[LLM 위키]]에 "이 저장소의 적용" 섹션을 두어 원문과 우리 결정을 구분해 병기하기로 했다 (사람 승인).

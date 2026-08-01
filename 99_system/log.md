# Log

append-only. 아래로 덧붙인다. 기존 항목은 고치거나 지우지 않는다.

형식: `## [YYYY-MM-DD] op | 제목`  (op: `ingest` | `query` | `lint`)

## [2026-08-01] setup | 위키 초기화

- `CLAUDE.md` 위키 스키마로 교체, 기존 코딩 가이드라인과 `docs/` 제거
- `00_raw/`, `00_raw/assets/`, `wiki/`, `99_system/` 생성
- `.claude/commands/`에 `ingest.md`, `query.md`, `lint.md` 작성

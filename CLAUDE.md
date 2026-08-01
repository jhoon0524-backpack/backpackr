# CLAUDE.md

## 역할

이 저장소는 개인 리서치·사고 기록용 LLM 위키다.

위키는 네가 쓰고 유지한다. 사람은 소스를 모으고, 질문하고, 승인한다.
너는 요약·상호링크·정리·기록을 맡는다.

업무 지식은 별도 노션 위키에 있다. 여기엔 넣지 않는다.

운영 절차는 `.claude/commands/`의 `/ingest`, `/query`, `/lint`에 있다.

## 레이어 규칙

1. **`00_raw/` — 원본.** 읽기 전용. 수정·삭제·이동·이름변경 금지. 웹클리퍼가 여기 저장한다.
2. **`wiki/` — 네 소유.** 생성·수정 전부 네 책임. 하위 폴더 금지, 전부 평면.
3. **`99_system/` — 위키의 상태.** 정해진 형식대로만 갱신한다. `log.md`와 `processed.md`는 append-only — 기존 줄을 고치거나 지우지 않는다.
4. **`CLAUDE.md`, `.claude/commands/` — 스키마와 절차.** 사람이 요청할 때만 고친다.

위키에 쓰는 모든 내용은 `00_raw/`의 원문에 근거해야 한다. 원문에 없는 건 쓰지 않는다.

## 디렉토리 맵

```
00_raw/                  원본 소스. 수정 금지.
00_raw/assets/           이미지 등 첨부물.
wiki/                    위키 페이지. 평면 구조.
99_system/index.md       전체 페이지 목록 + 한 줄 요약
99_system/log.md         활동 기록. append-only.
99_system/processed.md   인제스트 끝낸 00_raw 파일 목록. append-only.
.claude/commands/        /ingest /query /lint 절차
```

## 페이지 스키마

파일명은 한글, 고유명사는 원표기: `wiki/맥락공학.md`, `wiki/Anthropic.md`.
링크는 파일명으로 건다: `[[맥락공학]]`, 표시를 바꾸려면 `[[맥락공학|컨텍스트 엔지니어링]]`.

```markdown
---
type: concept
title: 맥락공학
updated: 2026-08-01
sources:
  - 00_raw/karpathy-llm-wiki.md
related:
  - "[[RAG]]"
  - "[[Anthropic]]"
---

한두 문장으로 이 페이지가 뭔지. index.md의 한 줄 요약은 여기서 뽑는다.

## (이하 자유 구성)
```

### frontmatter

| 필드 | 설명 |
|---|---|
| `type` | `entity` \| `concept` \| `synthesis` \| `source`. 분류는 이 필드로만 한다. |
| `title` | 파일명과 같게. |
| `updated` | 마지막으로 내용을 고친 날짜 (`YYYY-MM-DD`). |
| `sources` | 근거가 된 `00_raw/` 파일 경로. 위키 페이지가 아니라 원문을 적는다. |
| `related` | 관련 페이지 `[[링크]]`. 양방향으로 맞춘다. |

### type

- **`entity`** — 사람, 조직, 제품, 논문, 사건. 다른 데서 링크 걸 만한 독립 개체.
- **`concept`** — 아이디어, 이론, 방법론, 패턴.
- **`synthesis`** — 여러 소스를 가로지르는 관점·결론. `/query`의 저장 결과가 주로 여기.
- **`source`** — 원문 1개에 대응하는 요약 페이지. `sources:`에 그 원문 하나만 적는다.

### 본문

- 주장에는 근거 원문을 밝힌다.
- 확실하지 않으면 "미확인"이라고 쓴다. 추측을 사실처럼 쓰지 않는다.
- 상충하는 정보는 한쪽을 지우지 말고 양쪽을 병기하고 각각 어느 소스에서 왔는지 밝힌다.

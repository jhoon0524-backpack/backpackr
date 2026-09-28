# Agent Instructions for Obsidian Vault

> 이 파일은 `knowledge-vault/` 폴더(두 Vault 의 부모 폴더)에 둔다.
> Claude Code 는 **실행한 폴더의 CLAUDE.md** 만 자동으로 읽으므로, 항상 이 폴더에서 실행한다.

## 0. 구조

| 폴더 | 역할 | 주체 |
|---|---|---|
| `LLM_Wiki_Vault/` | 외부 아티클·전사본 요약, AI 가 만든 지식 카드 | LLM 이 쓰고, 사람이 관리 |
| `Main_Vault/` | 사람이 검수·승인한 확정 지식 | 사람이 주인, AI 는 보조 |

- 규칙·태그·필드 정의는 `Main_Vault/000_Meta/Guide.md` 를 따른다. 작업 전에 읽는다.
- 전체 목차는 `Main_Vault/000_Meta/Headquarter.md` 다.

## 1. Rules
1. 모든 문서는 상단에 YAML Frontmatter 를 반드시 포함해야 한다.
2. Frontmatter 내 `type`, `description`, `created`, `tags` 필드는 필수다.
3. 태그 작성 시 `Guide.md` 의 기존 태그 체계를 참조하고, 태그에 숫자가 맨 앞에 오지 않도록 주의한다.
   (`class: 100_Research` 는 태그가 아니라 필드이므로 숫자로 시작해도 된다.)
4. 신규 위키 카드를 생성할 때는 기존 카드와 쌍방향 링크(`[[Note_Name]]`)를 2개 이상 형성한다.
   새 카드에서 기존 카드로 링크를 걸고, **기존 카드의 `Related Notes` 에도 새 카드 링크를 추가**한다.
5. `000_Meta/` 폴더 내의 시스템 파일과 이 `CLAUDE.md` 는 사용자의 명시적 승인 없이 수정하지 않는다.
   단 하나의 예외: 사용자가 "승인" 작업(4장 3번)을 요청했을 때 `Headquarter.md` 에 목차 줄을 **추가**하는 것.
6. `Main_Vault/` 의 문서는 사용자가 요청한 것만 만들거나 고친다. AI 가 스스로 옮기거나 지우지 않는다.
7. 문서를 만들거나 고친 뒤에는 `python3 check_vault.py` 를 실행해 오류가 0개인지 확인한다.

## 2. File Organization
- 들어온 원문(전사본·아티클·메모): `LLM_Wiki_Vault/00_Inbox/`
- 위키 카드/개념: `LLM_Wiki_Vault/LLM_Wiki/`
- 연구/분석: `Main_Vault/100_Research/`
- 프로젝트/기획: `Main_Vault/200_Projects/`
- 자산/참조 자료: `Main_Vault/600_Resources/`
- 페르소나/전담 에이전트: `Main_Vault/900_Personas/`

## 3. 파일 이름
- 파일 이름 = 문서 제목. 공백 대신 `_` 를 쓴다. 예: `Atomic_Notes.md`
- 링크는 확장자 없이 `[[Atomic_Notes]]` 로 건다.
- 같은 이름의 카드가 이미 있으면 새로 만들지 말고 기존 카드에 내용을 보탠다.

## 4. 작업 절차

### 1) 인풋 수집
- 전사본·아티클 원문을 `00_Inbox/` 에 `type: source` 로 저장한다. 원문은 요약하지 않고 그대로 둔다.

### 2) 카드 분할
- `00_Inbox/` 의 원문 하나를 읽고 **한 카드 = 한 개념**(원자적 노트)으로 나눈다.
- 각 카드는 `LLM_Wiki_Vault/000_Meta/Templates/Note_Template.md` 형식을 따른다.
- `tags` 에 `status/draft` 를 넣고, `session_link` 에 원문 파일 링크(`[[원문_파일명]]`)를 넣는다.
- 원문에 없는 내용을 지어내지 않는다. 추론이 섞였으면 본문에 "(AI 추론)" 이라고 표시한다.
- 끝나면 만든 카드 목록을 사용자에게 보여 준다.

### 3) 검수·승인 (사용자가 요청할 때만)
- 사용자가 지목한 카드만 다룬다.
- 태그 `status/draft` → `status/approved`, `updated` 를 오늘 날짜로 바꾼다.
- 사용자가 "이관"을 요청하면 `Main_Vault/<class 폴더>/` 로 옮기고 `type: note` 로 바꾼다.
- `Headquarter.md` 의 해당 분류 아래에 `- [[카드이름]] — description` 한 줄을 추가한다.

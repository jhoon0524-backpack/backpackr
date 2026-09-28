# knowledge-vault — LLM Wiki + Main Vault 지식 관리 템플릿

구예환 교수님 방식의 "AI 가 쓰는 위키 + 사람이 승인하는 메인 볼트" 구조를 바로 쓸 수 있게 만든 빈 틀.

```
[인풋: 음성, 아티클, 메모]
         │
         ▼
┌───────────────────┐   사람이 검수·승인   ┌───────────────────┐
│  LLM_Wiki_Vault   │ ─────────────────► │    Main_Vault     │
│  (AI 가 만든 카드) │                    │  (확정 지식 자산)  │
└───────────────────┘                    └───────────────────┘
```

## 들어 있는 것

```
knowledge-vault/                ← Claude Code 는 여기서 실행
├── CLAUDE.md                   AI 행동 지침 (규칙·폴더·작업 절차)
├── check_vault.py              규칙 자동 검사기
├── Main_Vault/                 ← 옵시디언 Vault ①
│   ├── 000_Meta/
│   │   ├── Headquarter.md      메인 목차
│   │   ├── Guide.md            필드·태그·분류 정의서
│   │   └── Templates/Note_Template.md
│   ├── 100_Research/  200_Projects/  600_Resources/  900_Personas/
└── LLM_Wiki_Vault/             ← 옵시디언 Vault ②
    ├── 000_Meta/Templates/     Note_Template.md (위키 카드), Source_Template.md (원문)
    ├── 00_Inbox/               전사본·아티클 원문
    └── LLM_Wiki/               AI 가 만든 개념 카드
```

## 처음 한 번 설정 (10분)

1. 이 `knowledge-vault` 폴더를 내 컴퓨터의 원하는 위치(예: 문서 폴더)에 복사한다.
2. 옵시디언에서 **"보관함 폴더 열기"** 로 `Main_Vault` 를 연다. 같은 방법으로 `LLM_Wiki_Vault` 도 연다.
   → 두 Vault 가 따로 열린다.
3. 각 Vault 에서 **설정 → 코어 플러그인 → 템플릿** 을 켜고, 템플릿 폴더 위치를 `000_Meta/Templates` 로 지정한다.
   이제 새 노트에서 "템플릿 삽입"을 누르면 `{{title}}`, `{{date}}` 가 제목·오늘 날짜로 바뀐다.
4. 터미널에서 `knowledge-vault` 폴더로 이동해 `claude` 를 실행한다.
   (두 Vault 의 부모 폴더에서 실행해야 AI 가 두 Vault 를 모두 보고 `CLAUDE.md` 도 읽는다.)

## 매일 쓰는 법 — 프롬프트 3개

Claude Code 에 아래 문장을 그대로 붙여 넣는다. `< >` 부분만 바꾼다.

**① 인풋 저장** — 녹음 전사본이나 아티클을 붙여 넣으며

```
아래 원문을 00_Inbox 에 Source_Template 형식으로 저장해. 파일 이름은 <2026-09-28_팀회의>.
<원문 붙여넣기>
```

**② 카드 분할**

```
CLAUDE.md 4장 2) 절차대로 00_Inbox/<2026-09-28_팀회의> 를 위키 카드로 나눠 줘.
끝나면 check_vault.py 를 돌리고, 만든 카드 목록과 각 description 을 보여 줘.
```

**③ 검수·승인** — 옵시디언에서 카드를 읽어 본 뒤

```
<카드이름1>, <카드이름2> 를 승인해 줘. Main_Vault 로 이관하고 Headquarter 에 올려 줘.
```

(이관 없이 태그만 바꾸려면 "이관은 하지 말고 승인 태그만 붙여 줘" 라고 쓴다.)

## 규칙 검사기

```
python3 check_vault.py
```

| 구분 | 무엇을 보나 |
|---|---|
| 오류 | frontmatter 없음 · 필수 필드(`type`, `description`, `created`, `tags`) 비어 있음 · 숫자로 시작하는 태그 · 위키 카드의 카드 링크 2개 미만 |
| 경고 | 없는 문서로 가는 링크 · 한쪽으로만 걸린 카드 링크 |

오류가 있으면 AI 가 스스로 고치도록 `CLAUDE.md` 에 적어 두었다. 템플릿 폴더는 검사하지 않는다.

## 원본 가이드와 다르게 정한 점

원본 설명끼리 서로 맞지 않는 곳이 있어 아래처럼 정리했다. 바꾸고 싶으면 `CLAUDE.md` 를 고치면 된다.

| 원본 | 충돌 | 이 템플릿의 선택 |
|---|---|---|
| `CLAUDE.md` 를 `000_Meta/` 에 둔다 vs Root 에 둔다 | Claude Code 는 실행 폴더의 `CLAUDE.md` 만 자동으로 읽는다 | 두 Vault 의 부모 폴더(`knowledge-vault/`)에 둔다 |
| Vault 두 개 vs `LLM_Wiki/` 폴더 하나 | 둘 다 적혀 있음 | Vault 두 개. 카드는 `LLM_Wiki_Vault/LLM_Wiki/` 에 둔다 |
| `000_Meta` 수정 금지 vs 승인 때 `Headquarter.md` 에 추가 | 규칙 5와 3단계가 충돌 | 사용자가 승인을 요청했을 때 목차 줄 **추가만** 허용 |
| 전사본을 어디 두는지 없음 | — | `LLM_Wiki_Vault/00_Inbox/` 추가, `type: source` |

## 알아 둘 한계

- 옵시디언 링크 `[[ ]]` 는 **같은 Vault 안에서만** 이어진다. 카드를 Main_Vault 로 옮기면,
  아직 LLM_Wiki_Vault 에 남은 카드로 가는 링크는 끊긴다 (검사기가 경고로 알려 준다).
  관련 카드를 함께 승인하거나, 끊긴 링크는 그대로 두고 나중에 이어 준다.
- 음성 녹음 → 전사(STT)는 이 템플릿 밖이다. Plaud Note, Whisper 등으로 만든 텍스트를 ① 프롬프트에 붙여 넣는다.

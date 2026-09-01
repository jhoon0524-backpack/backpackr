# AI 자율 루프 킷 (ai-loop-kit)

클로드가 스스로 새 세션을 열어 한 바퀴씩 개발하는 "자율 개발 루프"를
**어떤 프로젝트 폴더에든 명령 한 줄로 설치**하는 킷입니다.

## 설치 (명령 한 줄)

```bash
bash ai-loop-kit/install.sh <설치할 프로젝트 폴더>
```

예시:

```bash
bash ai-loop-kit/install.sh ~/my-new-game
```

- 폴더가 없으면 만들고, git 저장소가 아니면 `git init` 부터 알아서 합니다.
- **이미 있는 파일은 절대 덮어쓰지 않습니다** — 기존 프로젝트에 넣어도 안전합니다.
- 새로 만든 저장소라면 첫 커밋까지 남깁니다.

## 킷에 들어 있는 것

```
ai-loop-kit/
├── install.sh              ← 설치 스크립트
└── templates/
    ├── loop/
    │   ├── loop.sh         ← 루프 본체 (바퀴마다 새 헤드리스 세션)
    │   ├── env.sh          ← 설정 (모델/최대 턴/대기/최대 바퀴/권한 모드)
    │   ├── PROMPT.md       ← 6절 지시서 틀 (①②③은 프로젝트마다 직접 작성,
    │   │                      ⑥에는 화면 결과물을 별도 비평가 AI가 채점하는 절차 내장)
    │   ├── loopctl.sh      ← 켜기/끄기/상태 제어 스크립트
    │   └── ai-loop.service ← 리눅스 자동 실행(systemd) 템플릿
    ├── docs/
    │   ├── DESIGN.md       ← 무엇을 만드는가 (직접 작성)
    │   ├── STATUS.md       ← 어디까지 했나 (루프가 갱신)
    │   └── feedback/INBOX.md ← 사람이 던지는 지시함
    ├── claude-agents/
    │   └── design-critic.md ← 비평가 에이전트 등록 파일 (설치 시 .claude/agents/ 로)
    ├── LOOP-README.md      ← 설치된 프로젝트용 사용 설명서
    └── gitignore           ← 설치 시 .gitignore 로 이름이 바뀜
```

## 설치 후 반드시 할 일 (품질은 여기서 결정됩니다)

1. `loop/PROMPT.md` — ①합격 기준 한 문장, ②문서별 읽을 범위, ③규칙과 근거("왜" 포함)
2. `docs/DESIGN.md` — 무엇을 만들고, 무엇을 만들지 않는지
3. `loop/env.sh` — 모델·턴 수·대기 시간 확인

## 킷을 다른 사람에게 주려면

`ai-loop-kit/` 폴더 하나만 통째로 복사해 주면 됩니다. 외부 의존성 없이
bash + git + claude CLI 만 있으면 어디서든 동작합니다.

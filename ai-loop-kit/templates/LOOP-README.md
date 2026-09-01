# AI 자율 개발 루프

클로드(Claude Code)가 스스로 새 세션을 열어 한 바퀴씩 개발을 진행하는 자율 루프 뼈대입니다.
기억은 대화가 아니라 `docs/` 안의 문서 파일이 대신합니다.

## 만든 파일 목록

| 파일 | 역할 |
|---|---|
| `loop/loop.sh` | 루프 본체. 한 바퀴마다 헤드리스 클로드 세션을 새로 연다 |
| `loop/env.sh` | 설정 (모델 / 한 바퀴 최대 턴 수 / 바퀴 사이 대기 / 최대 바퀴 수) |
| `loop/PROMPT.md` | 지시서. ①합격기준 ②먼저 읽을 문서 ③규칙과 근거는 **직접 채워야 함** |
| `loop/loopctl.sh` | 켜기 / 끄기 / 상태 보기 제어 스크립트 |
| `loop/ai-loop.service` | 리눅스 자동 실행(systemd) 등록용 템플릿 |
| `docs/DESIGN.md` | 무엇을 만드는가 (초기 기획서, 거의 안 고침) — **직접 채워야 함** |
| `docs/STATUS.md` | 어디까지 했고 다음은 뭔가 (한 바퀴마다 루프가 갱신) |
| `docs/feedback/INBOX.md` | 사람이 던지는 지시 (루프가 가장 먼저 처리) |
| `logs/` | 날짜별 실행 로그 (`loop-YYYYMMDD.log`, git에는 안 올라감) |

## 켜는 법 / 끄는 법 / 상태 보는 법

```bash
bash loop/loopctl.sh start    # 켜기 (백그라운드로 돌아서 터미널 닫아도 유지)
bash loop/loopctl.sh stop     # 끄기 (현재 바퀴를 마치고 멈춤)
bash loop/loopctl.sh status   # 상태 + 최근 로그 20줄
```

- 끄기는 `loop/STOP` 파일을 만드는 방식입니다. 진행 중인 바퀴는 끝까지 마치고 멈춥니다.
- 로그는 `logs/loop-날짜.log` 에 쌓입니다. `tail -f logs/loop-$(date +%Y%m%d).log` 로 실시간 확인.

## 자동 실행 등록 (컴퓨터를 껐다 켜도 계속 돌게)

`loopctl.sh start` 만으로도 터미널을 닫을 수 있지만, 재부팅 후에도 자동으로 돌리려면
본인 컴퓨터에서 OS별로 등록하세요.

- **리눅스**: `loop/ai-loop.service` 템플릿의 경로를 고친 뒤 파일 안의 등록 명령을 실행
- **맥**: launchd(`~/Library/LaunchAgents`)에 plist 등록
- **윈도우**: 작업 스케줄러에 "로그온 시 시작"으로 등록

> 주의: 자동 실행은 평소 터미널 PATH를 물려받지 않습니다. `which claude` 로 확인한
> 경로가 유닛 파일의 `Environment=PATH=...` 에 포함되어 있어야 합니다.

## 켜기 전에 반드시 할 일

1. `loop/PROMPT.md` 의 ①합격 기준, ②읽을 범위, ③규칙과 근거를 직접 채우세요.
   비어 있으면 AI는 "돌아가기만 하면 완료"로 판단합니다.
2. `docs/DESIGN.md` 에 무엇을 만들지 적으세요.
3. `loop/env.sh` 에서 모델·턴 수·대기 시간을 확인하세요.

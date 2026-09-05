# .githooks/

tbb-po-agent 리포 공용 git hooks. **모든 시나리오(터미널 / Claude Code / IDE)에서 push·pull 시 설정된 webhook 채널로 자동 알림**.

## 활성화 (1회만)

```bash
bash .githooks/install.sh
```

내부적으로 `git config core.hooksPath .githooks` 를 설정합니다. 사용자별 설정이므로 clone 직후 한 번만 실행하면 됩니다.

## Slack Webhook 등록

Webhook URL을 다음 둘 중 한 가지 방식으로 등록하면 알림이 발송됩니다.

| 방식 | 설정 |
|------|------|
| 환경변수 (권장) | `export TBB_PO_SLACK_WEBHOOK="<Slack Incoming Webhook URL>"` (~/.zshrc 등) |
| 파일 | `.credentials/slack-webhook.txt` 에 한 줄로 저장 (gitignore 처리됨) |

URL이 없으면 hook은 조용히 skip → 신규 clone한 팀원이 첫 push에서 깨지지 않도록 의도된 동작.

## 훅 구성

| Hook | 동작 |
|------|------|
| `pre-push` | push되는 ref마다 브랜치·커밋·파일 통계를 묶어 Slack 발송 |
| `post-merge` | `git pull` (= fetch + merge) 완료 후 가져온 커밋을 Slack 발송 |

알림은 best-effort: 네트워크/Slack 오류가 나도 git push/pull 자체는 절대 막지 않습니다.

## 메시지 예시

```
:rocket: tbb-po-agent push by mins
• Branch: `main` → origin
• Commits (2):
• `8106c1d` docs(grounding): add 04-reward.md
• `68bb9cb` docs(prd): 선물 한정수량 동시성 PRD 작성
• 14 files changed, 1682 insertions(+), 65 deletions(-)
```

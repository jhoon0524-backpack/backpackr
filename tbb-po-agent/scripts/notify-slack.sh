#!/usr/bin/env bash
# tbb-po-agent Slack 알림 공용 스크립트
#
# 사용법:
#   notify-slack.sh "<message text>"
#
# Webhook URL 탐색 순서 (먼저 발견되는 것 사용):
#   1. TBB_PO_SLACK_WEBHOOK 환경변수
#   2. <repo>/.credentials/slack-webhook.txt
#
# webhook URL이 없으면 조용히 종료 (exit 0).
# 신규 clone한 팀원의 git push가 hook 때문에 깨지지 않도록 의도된 동작.

set -e

message="${1:-}"
[ -z "$message" ] && exit 0

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

webhook=""
if [ -n "${TBB_PO_SLACK_WEBHOOK:-}" ]; then
  webhook="$TBB_PO_SLACK_WEBHOOK"
elif [ -n "$repo_root" ] && [ -f "$repo_root/.credentials/slack-webhook.txt" ]; then
  webhook=$(tr -d '[:space:]' < "$repo_root/.credentials/slack-webhook.txt")
fi

[ -z "$webhook" ] && exit 0

# JSON-safe payload 생성 (macOS 기본 python3 사용)
payload=$(MSG="$message" python3 -c 'import json,os; print(json.dumps({"text": os.environ["MSG"]}))')

# 네트워크 오류로 git 동작이 멈추지 않도록 타임아웃 + 실패 무시
curl -sS -m 5 -X POST -H "Content-Type: application/json" \
  --data "$payload" \
  "$webhook" > /dev/null 2>&1 || true

exit 0

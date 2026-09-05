#!/usr/bin/env bash
# tbb-po-agent git hooks 설치 스크립트 (1회만 실행)
#
# 효과:
#   - git push/pull 시 설정된 webhook 채널에 자동 Slack 알림
#   - Claude Code의 /save·/sync 경로뿐 아니라 터미널에서 직접 git을 써도 동일하게 동작

set -e

cd "$(git rev-parse --show-toplevel)"

git config core.hooksPath .githooks
chmod +x .githooks/pre-push .githooks/post-merge scripts/notify-slack.sh

echo "✓ git hooks 활성화 (.githooks/)"
echo ""
echo "다음 단계: Slack Incoming Webhook URL을 등록하세요 (둘 중 하나)."
echo ""
echo "  1) 환경변수 (권장):"
echo "     export TBB_PO_SLACK_WEBHOOK=\"<Slack Incoming Webhook URL>\""
echo "     ~/.zshrc 또는 ~/.bashrc 에 추가하면 영구 적용."
echo ""
echo "  2) 파일:"
echo "     echo '<Slack Incoming Webhook URL>' > .credentials/slack-webhook.txt"
echo "     (.credentials/ 는 gitignore 처리되어 있음)"
echo ""
echo "Webhook URL이 없으면 알림은 조용히 skip됩니다 (push/pull 자체는 정상 동작)."

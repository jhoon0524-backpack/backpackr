#!/bin/sh
# TASKS.md 의 작업을 하나씩, 매번 새 AI 세션으로 연달아 실행한다.
# 사람이 매일 새 대화를 열고 PROMPTS.md 2번을 던지는 일을 대신한다.
#
#   sh run.sh        # 기본 최대 5개
#   sh run.sh 10     # 최대 10개
#
# 멈추는 조건: 남은 작업이 없음 / 작업이 하나도 안 끝남 / 최대 개수 도달 / STOP 파일

set -e
cd "$(dirname "$0")"

MAX="${1:-5}"
PERMISSION_MODE="${PERMISSION_MODE:-acceptEdits}"
PROMPT="CLAUDE.md 규칙에 따라 PROGRESS.md를 읽고 다음 작업 1개만 실행해"

LOG_DIR=.run-logs
mkdir -p "$LOG_DIR"
echo '*' > "$LOG_DIR/.gitignore"   # 로그가 커밋에 섞이지 않게
LOG="$LOG_DIR/$(date +%Y%m%d-%H%M%S).log"

remaining() { grep -c '^- \[ \]' TASKS.md || true; }

i=0
while [ "$i" -lt "$MAX" ]; do
  if [ -e STOP ]; then
    echo "STOP 파일이 있어 멈춘다. 다시 돌리려면 지운다."
    break
  fi
  before=$(remaining)
  if [ "$before" -eq 0 ]; then
    echo "남은 작업이 없다."
    break
  fi

  i=$((i + 1))
  echo "[$i/$MAX] 시작 — 남은 작업 $before 개 (기록: $LOG)"
  # 매번 새 세션. 앞 대화를 이어받지 않고 PROGRESS.md 로만 이어진다.
  claude -p "$PROMPT" --permission-mode "$PERMISSION_MODE" >> "$LOG" 2>&1 || true

  after=$(remaining)
  if [ "$after" -ge "$before" ]; then
    echo "작업이 끝나지 않아 멈춘다. PROGRESS.md 와 $LOG 를 확인한다."
    break
  fi
  echo "[$i/$MAX] 완료 — 남은 작업 $after 개"
done

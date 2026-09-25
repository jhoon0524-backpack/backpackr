#!/bin/sh
# TASKS.md 의 작업을 하나씩, 매번 새 AI 세션으로 연달아 실행한다.
# 사람이 매일 새 대화를 열고 PROMPTS.md 2번을 던지는 일을 대신한다.
#
#   sh run.sh        # 기본 최대 5개
#   sh run.sh 10     # 최대 10개
#
# 멈추는 조건: 남은 작업이 없음 / 작업이 완료 처리되지 않음 / AI 실행 실패 / 최대 개수 도달 / STOP 파일
# 완료 처리 = TASKS.md 의 체크 표시가 늘고, 새 커밋이 생김 (CLAUDE.md 5장)
# STOP 파일은 돌고 있는 세션을 끊지 않는다. 그 세션이 끝난 뒤 다음 세션을 막는다.

set -e
cd "$(dirname "$0")"

MAX="${1:-5}"
case "$MAX" in
  ''|*[!0-9]*|0) echo "사용법: sh run.sh [최대 작업 수, 1 이상 정수]" >&2; exit 1 ;;
esac
if [ ! -r TASKS.md ]; then
  echo "TASKS.md 가 없다. PROMPTS.md 1번으로 먼저 만든다." >&2
  exit 1
fi

PERMISSION_MODE="${PERMISSION_MODE:-acceptEdits}"
PROMPT="CLAUDE.md 규칙에 따라 PROGRESS.md를 읽고 다음 작업 1개만 실행해"

LOG_DIR=.run-logs
mkdir -p "$LOG_DIR"
echo '*' > "$LOG_DIR/.gitignore"   # 로그가 커밋에 섞이지 않게
LOG="$LOG_DIR/$(date +%Y%m%d-%H%M%S).log"

# 내용이 있는 미완료 항목만 센다. 템플릿의 빈 "- [ ]" 는 작업이 아니다.
remaining() { grep -c '^- \[ \] *[^[:space:]]' TASKS.md || true; }
checked()   { grep -c '^- \[[xX]\]' TASKS.md || true; }
head_commit() { git rev-parse HEAD 2>/dev/null || echo none; }

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
  done_before=$(checked)
  head_before=$(head_commit)

  i=$((i + 1))
  echo "[$i/$MAX] 시작 — 남은 작업 $before 개 (기록: $LOG)"
  # 매번 새 세션. 앞 대화를 이어받지 않고 PROGRESS.md 로만 이어진다.
  if ! claude -p "$PROMPT" --permission-mode "$PERMISSION_MODE" >> "$LOG" 2>&1; then
    echo "AI 실행이 실패해 멈춘다. $LOG 를 확인한다." >&2
    exit 1
  fi
  if [ ! -r TASKS.md ]; then
    echo "TASKS.md 가 사라져 멈춘다. $LOG 를 확인한다." >&2
    exit 1
  fi

  if [ "$(checked)" -le "$done_before" ] || [ "$(head_commit)" = "$head_before" ]; then
    echo "작업이 완료 처리되지 않아 멈춘다 (체크 표시와 커밋이 모두 있어야 완료). PROGRESS.md 와 $LOG 를 확인한다."
    break
  fi
  echo "[$i/$MAX] 완료 — 남은 작업 $(remaining) 개"
done

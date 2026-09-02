#!/usr/bin/env bash
# =========================================
# 루프 제어 스크립트 (loop/loopctl.sh)
# 켜기 / 끄기 / 상태 보기를 한 번에.
#
#   bash loop/loopctl.sh start    # 루프 켜기 (백그라운드)
#   bash loop/loopctl.sh stop     # 루프 끄기 (현재 바퀴를 마치고 멈춤)
#   bash loop/loopctl.sh status   # 상태 + 최근 로그 보기
# =========================================
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$SCRIPT_DIR/loop.pid"

is_running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

case "${1:-}" in
  start)
    if is_running; then
      echo "이미 실행 중입니다 (PID: $(cat "$PID_FILE"))."
      exit 0
    fi
    rm -f "$SCRIPT_DIR/STOP"
    mkdir -p "$ROOT_DIR/logs"
    nohup bash "$SCRIPT_DIR/loop.sh" >> "$ROOT_DIR/logs/loopctl.out" 2>&1 &
    echo "루프를 켰습니다 (PID: $!). 로그: logs/loop-$(date +%Y%m%d).log"
    ;;
  stop)
    touch "$SCRIPT_DIR/STOP"
    echo "STOP 파일을 만들었습니다. 현재 바퀴를 마치는 대로 멈춥니다."
    if is_running; then
      echo "(지금 바로 끊으려면: kill $(cat "$PID_FILE"))"
    fi
    ;;
  status)
    if is_running; then
      echo "상태: 실행 중 (PID: $(cat "$PID_FILE"))"
    else
      echo "상태: 꺼져 있음"
    fi
    [ -f "$SCRIPT_DIR/STOP" ] && echo "STOP 파일 있음 — 시작하려면 start 로 켜면 자동 삭제됩니다."
    latest_log="$(ls -t "$ROOT_DIR"/logs/loop-*.log 2>/dev/null | head -1 || true)"
    if [ -n "${latest_log:-}" ]; then
      echo "--- 최근 로그 ($latest_log) ---"
      tail -20 "$latest_log"
    else
      echo "로그 파일이 아직 없습니다."
    fi
    ;;
  *)
    echo "사용법: bash loop/loopctl.sh {start|stop|status}"
    exit 1
    ;;
esac

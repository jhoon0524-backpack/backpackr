#!/usr/bin/env bash
# =========================================
# AI 자율 개발 루프 본체 (loop/loop.sh)
#
# 핵심 원칙:
#   - 무한 반복. 한 바퀴마다 헤드리스 클로드 세션을 "새로" 연다.
#     대화를 이어 붙이지 않는다. 기억은 docs/ 파일이 대신한다.
#   - 세션에는 loop/PROMPT.md 를 읽고 일하라고 준다.
#   - 한 바퀴마다 logs/ 에 날짜별 로그를 남긴다.
#   - loop/STOP 파일이 있으면 현재 바퀴를 마치고 멈춘다.
#   - 설정은 loop/env.sh 로 분리되어 있다.
# =========================================
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=env.sh
source "$SCRIPT_DIR/env.sh"

mkdir -p "$ROOT_DIR/logs"

# 자동 실행 환경은 평소 터미널 PATH 를 물려받지 않으므로 명시한다.
# (빠뜨리면 claude 실행 파일을 못 찾고 조용히 죽는다)
export PATH="/opt/node22/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin:$PATH"

log() {
  local logfile="$ROOT_DIR/logs/loop-$(date +%Y%m%d).log"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$logfile"
}

echo $$ > "$SCRIPT_DIR/loop.pid"
trap 'rm -f "$SCRIPT_DIR/loop.pid"' EXIT

log "===== 루프 시작 (모델: $MODEL, 최대 턴: $MAX_TURNS, 대기: ${SLEEP_BETWEEN}s, 최대 바퀴: $MAX_LOOPS, DRY_RUN: $DRY_RUN) ====="

loop_count=0
while :; do
  # STOP 파일이 있으면 멈춘다
  if [ -f "$SCRIPT_DIR/STOP" ]; then
    log "STOP 파일 발견 — 루프를 종료합니다. (다시 켜려면 loop/STOP 삭제 후 시작)"
    break
  fi

  # 최대 바퀴 수 도달 시 정상 종료
  if [ "$MAX_LOOPS" -gt 0 ] && [ "$loop_count" -ge "$MAX_LOOPS" ]; then
    log "최대 바퀴 수($MAX_LOOPS)에 도달 — 정상 종료합니다."
    break
  fi

  loop_count=$((loop_count + 1))
  log "----- 바퀴 #$loop_count 시작 -----"

  cd "$ROOT_DIR"

  if [ "$DRY_RUN" = "1" ]; then
    log "(DRY_RUN) 클로드 호출을 건너뜁니다. 실제 실행이라면 여기서 새 헤드리스 세션이 열립니다."
    sleep 1
  else
    # 매 바퀴 "새" 헤드리스 세션. 이전 대화를 이어받지 않는다.
    # 권한 모드는 env.sh 의 PERMISSION_MODE 로 조절한다.
    claude -p "loop/PROMPT.md 를 읽고, 거기 적힌 지시대로 한 바퀴만 작업해라." \
      --model "$MODEL" \
      --max-turns "$MAX_TURNS" \
      --permission-mode "$PERMISSION_MODE" \
      >> "$ROOT_DIR/logs/loop-$(date +%Y%m%d).log" 2>&1
    exit_code=$?
    log "바퀴 #$loop_count 세션 종료 (종료 코드: $exit_code)"
  fi

  log "----- 바퀴 #$loop_count 끝 — ${SLEEP_BETWEEN}초 대기 -----"
  sleep "$SLEEP_BETWEEN"
done

log "===== 루프 종료 (총 ${loop_count}바퀴) ====="

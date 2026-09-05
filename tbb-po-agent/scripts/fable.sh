#!/usr/bin/env bash
# fable 오케스트레이션 스위치 (프로젝트 로컬)
#
# 본체는 .claude/fable/ 에 있고, 이 스크립트는 심링크와 상태 파일만 조작한다:
#   fable on     .claude/fable/state/fable-state=on,  active.md -> fable.md  (지침 로드 + 게이트 활성)
#   fable off    .claude/fable/state/fable-state=off, active.md -> empty.md (오케스트레이션 비활성)
#   fable status 현재 상태와 설치 여부 점검
#
# sources/·.credentials/ 읽기 전용 보호는 fable off 상태에서도 항상 유지된다.
# CLAUDE.md는 세션 시작 시점에 로드되므로 토글은 다음 세션부터 적용된다.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FABLE_DIR="$REPO_ROOT/.claude/fable"
STATE_DIR="$FABLE_DIR/state"
STATE_FILE="$STATE_DIR/fable-state"

usage() {
  echo "사용법: scripts/fable.sh {on|off|status}"
  exit 1
}

set_state() {
  mkdir -p "$STATE_DIR"
  echo "$1" > "$STATE_FILE"
  if [ "$1" = "on" ]; then
    ln -sfn fable.md "$FABLE_DIR/active.md"
  else
    ln -sfn empty.md "$FABLE_DIR/active.md"
  fi
  echo "Fable 오케스트레이션: $(echo "$1" | tr '[:lower:]' '[:upper:]') (다음 세션부터 적용)"
}

status() {
  local state="on"
  [ -f "$STATE_FILE" ] && state="$(cat "$STATE_FILE")"
  echo "Fable 오케스트레이션: $(echo "$state" | tr '[:lower:]' '[:upper:]')"
  echo "  active.md -> $(readlink "$FABLE_DIR/active.md" 2>/dev/null || echo '(없음)')"

  check() { if eval "$2"; then echo "  [OK] $1"; else echo "  [MISSING] $1"; fi }
  check "@import        CLAUDE.md"                "grep -q '@.claude/fable/active.md' '$REPO_ROOT/CLAUDE.md'"
  check "지침           .claude/fable/fable.md"    "[ -f '$FABLE_DIR/fable.md' ]"
  check "agents         .claude/agents/"           "[ -f '$REPO_ROOT/.claude/agents/deep-reasoner.md' ] && [ -f '$REPO_ROOT/.claude/agents/runner.md' ]"
  check "게이트 훅      .claude/settings.json"     "grep -q 'orchestration-gate.py' '$REPO_ROOT/.claude/settings.json'"
  check "게이트 스크립트 orchestration-gate.py"     "[ -f '$FABLE_DIR/hooks/orchestration-gate.py' ]"
}

case "${1:-}" in
  on)  set_state on ;;
  off) set_state off ;;
  status) status ;;
  *) usage ;;
esac

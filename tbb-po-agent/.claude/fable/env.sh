# fable 스위치 로더 — ~/.zshrc 에서 source 하면 활성화 (선택 계층)
#
#   [ -f "$HOME/Projects/ai-projects/tbb-po-agent/.claude/fable/env.sh" ] && . "$HOME/Projects/ai-projects/tbb-po-agent/.claude/fable/env.sh"
#
# 현재 디렉터리 기준으로 fable이 on인 프로젝트에서 claude를 실행하면,
# frontmatter에 sonnet으로 고정된 실행 에이전트(oh-my-claudecode executor 등)를
# Opus 4.8로 승격한다. 실행 품질보다 비용이 우선이면 이 파일을 source하지 않으면 된다.
# 함수는 PWD 기준으로 fable-state를 탐색하므로 프로젝트 공통이다 — 여러 fable
# 프로젝트가 있어도 이 파일 하나만 source하면 전부 커버되고, 중복 source해도 무해하다.

_fable_project_on() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/.claude/fable/state/fable-state" ]; then
      [ "$(cat "$dir/.claude/fable/state/fable-state")" = "on" ]
      return
    fi
    dir="$(dirname "$dir")"
  done
  return 1
}

claude() {
  if _fable_project_on; then
    ANTHROPIC_DEFAULT_SONNET_MODEL="claude-opus-4-8" command claude "$@"
  else
    command claude "$@"
  fi
}

#!/usr/bin/env bash
# =========================================
# AI 자율 루프 킷 설치 스크립트
#
# 사용법:
#   bash ai-loop-kit/install.sh <설치할 프로젝트 폴더>
#   예) bash ai-loop-kit/install.sh ~/my-new-game
#
# 하는 일:
#   1. 폴더가 없으면 만들고, git 저장소가 아니면 git init
#   2. 루프 뼈대(loop/, docs/, LOOP-README.md, .gitignore) 복사
#      - 이미 있는 파일은 절대 덮어쓰지 않고 건너뜀
#   3. 새로 만든 저장소면 첫 커밋까지 남김
# =========================================
set -u

KIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES="$KIT_DIR/templates"

if [ $# -lt 1 ]; then
  echo "사용법: bash install.sh <설치할 프로젝트 폴더>"
  echo "예)    bash install.sh ~/my-new-game"
  exit 1
fi

TARGET="$1"
mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"

echo "== AI 자율 루프 킷 설치: $TARGET =="

# [1] git 저장소 준비
NEW_REPO=0
if [ ! -d "$TARGET/.git" ]; then
  git -C "$TARGET" init
  NEW_REPO=1
  echo "git 저장소를 새로 만들었습니다."
else
  echo "이미 git 저장소입니다. (git init 건너뜀)"
fi

# [2] 템플릿 복사 (있는 파일은 건너뜀)
copy_one() {
  local src="$1" dst="$2"
  if [ -e "$TARGET/$dst" ]; then
    echo "  건너뜀 (이미 있음): $dst"
  else
    mkdir -p "$TARGET/$(dirname "$dst")"
    cp "$TEMPLATES/$src" "$TARGET/$dst"
    echo "  복사: $dst"
  fi
}

copy_one "loop/loop.sh"           "loop/loop.sh"
copy_one "loop/env.sh"            "loop/env.sh"
copy_one "loop/PROMPT.md"         "loop/PROMPT.md"
copy_one "loop/loopctl.sh"        "loop/loopctl.sh"
copy_one "loop/ai-loop.service"   "loop/ai-loop.service"
copy_one "docs/DESIGN.md"         "docs/DESIGN.md"
copy_one "docs/STATUS.md"         "docs/STATUS.md"
copy_one "docs/feedback/INBOX.md" "docs/feedback/INBOX.md"
copy_one "LOOP-README.md"         "LOOP-README.md"
copy_one "gitignore"              ".gitignore"

chmod +x "$TARGET/loop/loop.sh" "$TARGET/loop/loopctl.sh" 2>/dev/null || true
mkdir -p "$TARGET/logs"

# [3] 새 저장소면 첫 커밋
if [ "$NEW_REPO" = "1" ]; then
  git -C "$TARGET" add -A
  git -C "$TARGET" commit -m "AI 자율 개발 루프 뼈대 설치 (ai-loop-kit)" >/dev/null
  echo "첫 커밋을 남겼습니다."
fi

echo ""
echo "== 설치 완료 =="
echo "다음에 할 일:"
echo "  1. $TARGET/loop/PROMPT.md 의 ①합격기준 ②읽을범위 ③규칙과근거 를 채우세요"
echo "  2. $TARGET/docs/DESIGN.md 에 무엇을 만들지 적으세요"
echo "  3. 켜기:  cd $TARGET && bash loop/loopctl.sh start"
echo "     끄기:  bash loop/loopctl.sh stop / 상태: bash loop/loopctl.sh status"
echo "자세한 사용법: $TARGET/LOOP-README.md"

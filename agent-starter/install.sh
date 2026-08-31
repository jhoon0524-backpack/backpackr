#!/bin/sh
# 네 장을 대상 프로젝트에 복사한다. 이미 있는 파일은 건드리지 않는다.
#
#   sh install.sh ../my-new-service

set -e

TARGET="$1"
if [ -z "$TARGET" ]; then
  echo "사용법: sh install.sh <대상 폴더>" >&2
  exit 1
fi
if [ ! -d "$TARGET" ]; then
  echo "폴더가 없다: $TARGET" >&2
  exit 1
fi

SRC=$(dirname "$0")
copied=0
skipped=0

for f in CLAUDE.md SPEC.md TASKS.md PROGRESS.md PROMPTS.md; do
  if [ -e "$TARGET/$f" ]; then
    echo "  건너뜀  $f (이미 있음)"
    skipped=$((skipped + 1))
  else
    cp "$SRC/$f" "$TARGET/$f"
    echo "  복사됨  $f"
    copied=$((copied + 1))
  fi
done

echo
echo "복사 $copied / 건너뜀 $skipped"
if [ "$copied" -gt 0 ]; then
  echo
  echo "다음 할 일:"
  echo "  1. CLAUDE.md 의 << >> 를 채운다. 특히 3장 검증 명령"
  echo "  2. SPEC.md 를 채운다"
  echo "  3. PROMPTS.md 의 1번 프롬프트를 던져 TASKS.md 를 만든다"
fi

#!/usr/bin/env bash
# 레포의 정본 스킬과 이 환경에 설치된 개인 스킬을 대조한다.
# 갈라진 게 있으면 1로 종료한다.
#
# 기본 제공 스킬(docx·pdf 등)은 manifest.json의 source로 걸러낸다.
# 무시 목록을 손으로 관리하지 않는다 — 그 목록이 또 갈라진다.

set -u
cd "$(dirname "$0")/.."

repo=.claude/skills
mine=${HOME}/.claude/skills
drift=0

dirs() { [ -d "$1" ] && find "$1" -mindepth 2 -maxdepth 2 -name SKILL.md -printf '%h\n' | xargs -r -n1 basename | sort; }

# 설치본 중 직접 만든 것만. manifest를 못 읽으면 전부 본다.
custom() {
  python3 - "$mine" <<'PY' 2>/dev/null || dirs "$mine"
import json, os, sys
mine = sys.argv[1]
names = json.load(open(os.path.join(mine, "manifest.json")))["skills"]
custom = {s["name"] for s in names if s.get("source") == "custom"}
print("\n".join(sorted(n for n in custom if os.path.exists(os.path.join(mine, n, "SKILL.md")))))
PY
}

for name in $(dirs $repo); do
  if [ ! -e "$mine/$name/SKILL.md" ]; then
    echo "레포만    $name"
  elif diff -qr "$repo/$name" "$mine/$name" >/dev/null 2>&1; then
    echo "같음      $name"
  else
    echo "다름      $name  — 개인본이 정본과 다르다. 지운다: rm -rf $mine/$name"
    drift=1
  fi
done

for name in $(custom); do
  [ -e "$repo/$name/SKILL.md" ] && continue
  echo "미편입    $name  — 정본에 없다. 편입하거나 지운다"
  drift=1
done

[ "$(dirs $repo)" ] || echo "(정본에 스킬이 아직 없다)"
exit $drift

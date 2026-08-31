#!/bin/sh
# 로컬 DB 를 비우고 마이그레이션을 순서대로 다시 적용한다.
#
#   npm run db:reset
#
# Docker 가 되는 환경이라면 이 스크립트 대신 `npx supabase db reset` 을 쓴다.

set -e

DB="${DATABASE_URL:-postgresql://dropbid:dropbid@127.0.0.1:5432/dropbid_dev}"
DIR=$(dirname "$0")

# 이 스크립트는 public 스키마를 통째로 지운다. 로컬이 아닌 곳을 가리키면 멈춘다.
# CLAUDE.md 4장 — 스키마 변경과 데이터 삭제는 사람 승인 없이 실행하지 않는다.
case "$DB" in
  *@127.0.0.1:*|*@localhost:*|*@127.0.0.1/*|*@localhost/*) ;;
  *)
    echo "거부: 로컬이 아닌 DB 로 보인다. 이 스크립트는 스키마를 지운다." >&2
    echo "  대상: $DB" >&2
    exit 1
    ;;
esac

psql "$DB" -v ON_ERROR_STOP=1 -q -f "$DIR/bootstrap.sql"
echo "  준비  bootstrap.sql (auth 스키마 흉내)"

for f in "$DIR"/../migrations/*.sql; do
  psql "$DB" -v ON_ERROR_STOP=1 -q -f "$f"
  echo "  적용  $(basename "$f")"
done

echo "완료"

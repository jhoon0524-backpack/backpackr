#!/bin/bash
# 수집 세션 시작 시 1회 실행: Chromium이 프록시 인증서를 믿도록 등록하고, 구글플레이 리뷰 도구를 설치한다.
set -e
command -v certutil >/dev/null || (apt-get install -y -qq libnss3-tools >/dev/null 2>&1 || (apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq libnss3-tools >/dev/null 2>&1))
mkdir -p "$HOME/.pki/nssdb"
certutil -d "sql:$HOME/.pki/nssdb" -L >/dev/null 2>&1 || certutil -d "sql:$HOME/.pki/nssdb" -N --empty-password
tmp=$(mktemp -d); csplit -s -z -f "$tmp/c" /root/.ccr/ca-bundle.crt '/-----BEGIN CERTIFICATE-----/' '{*}'
i=0; for f in "$tmp"/c*; do
  case "$(openssl x509 -in "$f" -noout -subject 2>/dev/null)" in *Anthropic*) i=$((i+1)); certutil -d "sql:$HOME/.pki/nssdb" -A -t "C,," -n "proxy-ca-$i" -i "$f";; esac
done
rm -rf "$tmp"
pip install -q google-play-scraper 2>/dev/null
echo "setup ok (proxy CA $i개 등록)"

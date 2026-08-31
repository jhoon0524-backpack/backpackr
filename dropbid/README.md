# Dropbid

종료된 크라우드펀딩 창작 굿즈를 주 1회 드롭(동시 마감) 경매로 거래하는 서비스.

- 무엇을 만드는가 → `SPEC.md` (상세 근거는 `PRD.md`)
- 어떻게 일하는가 → `CLAUDE.md`
- 지금 무엇을 하는가 → `TASKS.md`
- 어디까지 왔는가 → `PROGRESS.md`

## 개발 환경

```
npm install
npm run dev          # http://localhost:3000
```

### 검증 명령

커밋 전에 세 개를 모두 통과시킨다. 자세한 규칙은 `CLAUDE.md` 3장.

```
npm test
npm run lint
npm run typecheck
```

`typecheck` 는 `next typegen && tsc --noEmit` 이다. `tsc` 만 돌리면 Next 가 생성하는
전역 타입(`LayoutProps` 등)이 없어서 갓 클론한 곳과 CI 에서 실패한다.

### 데이터베이스

정석은 Supabase 로컬 스택이다.

```
npx supabase start   # Docker 필요
```

Docker 를 쓸 수 없는 환경이라면 로컬 Postgres 로 대체할 수 있다.
입찰 로직(`place_bid`)은 순수 Postgres 기능(행 잠금 + plpgsql)만 쓰므로 이걸로 개발·테스트한다.
Auth·Storage·Realtime 은 이 방식으로 돌릴 수 없다.

```
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE USER dropbid WITH PASSWORD 'dropbid' SUPERUSER;"
sudo -u postgres createdb -O dropbid dropbid_dev
psql postgresql://dropbid:dropbid@127.0.0.1:5432/dropbid_dev -c "select 1"
```

주의: `supabase/config.toml` 은 Postgres 17 을 쓴다. 위 대체 경로는 16 이라 버전이 다르다.
버전에 의존하는 기능을 쓰게 되면 Supabase 스택에서 반드시 다시 확인할 것.

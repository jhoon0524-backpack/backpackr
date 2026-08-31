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

### 시연용 데이터

로그인이 아직 없어서 화면에서 사람을 골라 입찰한다. 카카오 로그인이 붙으면 그 선택기는 사라진다.

```
npm run db:reset && npm run db:seed
npm run dev            # http://localhost:3000
```

**주의: `npm test` 는 로컬 DB 를 초기화한다.** 테스트가 스키마를 지우고 마이그레이션을 다시 적용하기
때문이다. 테스트를 돌린 뒤 화면을 보려면 `npm run db:seed` 를 다시 실행한다.

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

### 마이그레이션을 프로덕션에 적용하기

**AI 는 마이그레이션 파일을 쓰기만 하고 실행하지 않는다** (`CLAUDE.md` 4장).
아래는 사람이 직접 밟는 절차다.

1. 적용될 것이 무엇인지 먼저 본다. 로컬에만 있고 원격에 없는 파일이 목록에 뜬다.
   ```
   npx supabase link --project-ref <프로젝트 ref>   # 최초 1회
   npx supabase migration list
   ```
2. 파일을 눈으로 읽는다. `drop`, `truncate`, `alter ... drop column`, `not null` 추가가 있으면
   기존 데이터가 어떻게 되는지 확인하기 전에는 진행하지 않는다.
3. 빈 DB 에서 순서대로 적용되는지 확인한다. 로컬에서 `npm run db:reset` 이 통과해야 한다.
4. 적용한다.
   ```
   npx supabase db push
   ```
5. 적용 후 `npx supabase migration list` 로 로컬과 원격이 같아졌는지 확인한다.

**되돌리기.** Supabase 마이그레이션은 앞으로만 간다. 자동 롤백이 없다.
잘못 나갔으면 되돌리는 마이그레이션을 새로 써서 다시 push 한다.
그래서 데이터를 지우거나 컬럼을 없애는 마이그레이션은 2번에서 특히 오래 본다.

**릴리즈 1단계(비공개 드롭) 전에는** 실제 결제가 포함되므로, push 직전에 백업 시점을 확인해 둔다.

### 마감 스케줄러 켜기

마이그레이션은 함수와 기록 테이블만 만든다. **1분마다 실제로 돌기 시작하는 시점은 사람이 정한다.**
`supabase/scheduler.sql` 을 Supabase SQL Editor 에서 실행한다.

돌고 있는지는 기록으로 본다. 처리 건수가 0인 실행도 남기므로, **기록이 끊긴 구간이 곧 멈춘 구간이다.**

```sql
select ran_at, processed, detail from scheduler_runs
 where job = 'close_due_auctions' order by ran_at desc limit 20;
```

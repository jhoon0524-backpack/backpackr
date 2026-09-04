# 커미션

창작자가 받을 수 있는 맞춤 작업을 메뉴로 열어 두고, 의뢰인이 의뢰하면 수락 → 작업 → 전달 → 완료까지 한 곳에서 처리하는 서비스.

- 무엇을 만드는가 → `SPEC.md`
- 어떻게 일하는가 → `CLAUDE.md`
- 지금 무엇을 하는가 → `TASKS.md`
- 어디까지 왔는가 → `PROGRESS.md`

## 배포

절차는 `DEPLOY.md` 에 있다. **아직 아무것도 올라가 있지 않고, 지금은 공개하면 안 된다** —
로그인이 없어서 쿠키 하나로 남이 될 수 있다. 그래서 시연용 로그인은 배포에서 기본으로 잠겨 있다.

## 개발 환경

```
npm install
npm run db:setup     # 로컬 Postgres 에 역할·DB 생성 → 마이그레이션 → 시연 데이터 (아래 "데이터베이스")
npm run dev          # http://localhost:3000
```

로그인이 아직 없어서 화면 위 "로그인 대신" 전환기로 사람을 골라 본다.
시연 데이터에서 **김창작·이글꼴** 이 커미션을 연 창작자, **박덕후·최의뢰** 가 의뢰인이다.

**주의: `npm test` 는 로컬 DB 를 초기화한다.** 테스트가 스키마를 지우고 마이그레이션을 다시 적용하기 때문이다.
테스트를 돌린 뒤 화면을 보려면 `npm run db:seed` 를 다시 실행한다.

### 검증 명령

커밋 전에 세 개를 모두 통과시킨다. 자세한 규칙은 `CLAUDE.md` 3장.

```
npm test
npm run lint
npm run typecheck
```

**시연 중이라 로컬 DB 를 지우고 싶지 않다면** 테스트용 DB 를 따로 준다. 화면을 띄워 둔 채로 검증할 수 있다.
(`npm test` 는 스키마를 지우고 마이그레이션을 다시 적용한다.)

```
sudo -u postgres createdb -O commission commission_test
DATABASE_URL=postgresql://commission:commission@127.0.0.1:5432/commission_test npx vitest run
```

### 데이터베이스

로컬 Postgres 를 쓴다 (dropbid 와 같은 방식). 슬롯 잠금 로직은 순수 Postgres 기능(행 잠금 + plpgsql)만 쓴다.

```
sudo pg_ctlcluster 16 main start
sudo -u postgres psql -c "CREATE USER commission WITH PASSWORD 'commission' SUPERUSER;"
sudo -u postgres createdb -O commission commission_dev
npm run db:reset && npm run db:seed
```

윈도우라면 `.env.local` 에 `POSTGRES_PASSWORD` 를 넣고 `npm run db:setup` 이 역할과 DB 를 만든다.

`supabase/local/bootstrap.sql` 은 로컬 전용이다 — Supabase 가 만들어 주는 `auth.users` 와 역할을 흉내낸다.
**프로덕션에는 `supabase/migrations/` 만 적용한다.** 절차는 `dropbid/README.md` "마이그레이션을 프로덕션에 적용하기" 와 같고, AI 는 파일을 쓰기만 하고 실행하지 않는다 (`CLAUDE.md` 4장).

## 디자인

"게시판" 방향 — 대학가 게시판에 붙은 전단처럼. 흰 바탕, 검정 3px 테두리, 딱딱한 그림자, 형광 노랑, 검은고딕 제목, 기울여 붙인 "N자리 남음" 스티커, 머리 아래 전광판.
토큰은 `app/globals.css`, 버튼·입력칸·칩 모양은 `app/ui.ts` 한 곳에 있다. 다른 두 방향(작업실·스케치북)은 디자인 캔버스에 나란히 있다 (`PROGRESS.md` 4차·6차).

## 차별점 — 펀딩 이력

의뢰인은 커미션 상세에서 창작자의 **텀블벅 후원자 수와 만족도**를 본다. 신규 커미션 서비스가 후기 0에서 시작하는 것과 달리
첫날부터 채워져 있다는 것이 이 서비스의 축이다. 표시 규칙은 `lib/format.ts` 의 `trustFromFunding` 한 곳에 있다.

**지금 값은 전부 시연용 더미다** — 텀블벅 본 서비스와 연결되어 있지 않다 (`TASKS.md` 의 실연동 항목).

## 화면

| 주소 | 무엇 |
|---|---|
| `/` | 열려 있는 커미션 목록. 남은 자리 배지 |
| `/commissions/[id]` | 커미션 상세와 의뢰 폼. 닫힘·자리 없음·내 커미션이면 폼 대신 안내 |
| `/open` | 커미션 열기 |
| `/me` | 들어온 의뢰 / 내 커미션(열기·닫기) / 내가 넣은 의뢰 |
| `/requests/[id]` | 의뢰 상세. 당사자만 본다. 역할과 상태에 따라 할 일 하나만 보인다 |

## 상태 흐름

```
requested ─┬─▶ accepted ──▶ delivered ──▶ completed
           ├─▶ declined   (창작자, 사유 필수)
           └─▶ cancelled  (의뢰인, 수락 전까지만)
```

슬롯은 `accepted` + `delivered` 를 센다. 의뢰인이 완료를 눌러야 자리가 빈다.
상태 변경은 DB 함수 6개로만 하고, 수락은 커미션 행을 잠가 동시 수락이 슬롯을 넘지 못하게 한다 (`__tests__/db/accept_concurrency.test.ts`).

# 인수인계

이 문서는 **개발자가 아닌 사람이 개발자에게 넘길 때** 읽히는 것을 목적으로 한다.
기술적 판단의 근거는 `PROGRESS.md` 에, 남은 일 목록은 `TASKS.md` 에 있다.

## 한 줄

경매 엔진과 화면 골격은 동작한다. **로그인·결제·알림 발송은 외부 계정 키가 없어 멈춰 있다.**

## 지금 되는 것

판매자가 상품을 올리고 → 운영자가 검수해 회차에 배정하고 → 구매자가 입찰하고 →
마감되면 낙찰·유찰이 갈리고 → 낙찰자에게 24시간 결제 기한이 생긴다.
브라우저로 이 흐름을 끝까지 눌러 확인했다.

경매 규칙은 애플리케이션이 아니라 **데이터베이스가** 강제한다. 화면을 새로 만들거나
API 를 바꿔도 규칙은 그대로다. 인수 조건 대조는 `ACCEPTANCE.md` 참고.

## 지금 안 되는 것과 그 이유

| 항목 | 막힌 이유 | 푸는 방법 |
|---|---|---|
| 카카오 로그인 | 카카오 개발자 앱 키가 없다 | 앱 등록 후 Supabase Auth 에 키 입력 → `lib/session.ts` 만 수정 |
| 사진 업로드 | Supabase Storage 미설정 | 버킷 생성 후 `/sell` 의 주소 입력을 파일 선택으로 교체 |
| 결제 | 포트원 가맹점 심사 미완 | 심사 통과 후 결제 요청·웹훅 연동 |
| 알림 발송 | 알림톡 발신 프로필·템플릿 미승인 | 승인 후 `notifications` 의 `pending` 을 집어 보내는 발송기 작성 |
| 실시간 현재가 | Realtime 미설정 | Supabase Realtime 구독 + 끊기면 폴링 폴백 |

**알림톡 템플릿 승인은 며칠 걸린다.** 가장 먼저 신청해 두는 편이 낫다.

## 개발자가 처음 할 일

```
cd dropbid
npm install
npm run db:reset && npm run db:seed    # 로컬 DB 초기화 + 시연 데이터
npm run dev                            # http://localhost:3000
```

Docker 가 있으면 `npx supabase start` 가 정석이다. 없으면 `README.md` 의 로컬 Postgres 절차를 따른다.
커밋 전에는 `npm test`, `npm run lint`, `npm run typecheck` 세 개를 통과시킨다 (`CLAUDE.md` 3장).

## 이미 만들어져 있는 것

- **Supabase 프로젝트** `dropbid` (서울, 월 0원). 스키마 전체 적용됨. 테이블 8개·함수 8개
- **CI** — 푸시마다 진짜 Postgres 를 띄워 테스트 105개를 돌린다
- **행 수준 보안(RLS)** — 연락처·주문·알림은 본인만 본다. 공개 점검에서 오류 0건

## 마감 스케줄러 — 켜져 있다

승인을 받아 `dropbid` 프로젝트에 등록했고 **1분 주기로 돌고 있다.**
끄려면 Supabase SQL Editor 에서:

```sql
select cron.unschedule('close-due-auctions');
```

돌고 있는지 확인:

```sql
select ran_at, processed, detail from scheduler_runs
 where job = 'close_due_auctions' order by ran_at desc limit 20;
```

처리 건수가 0인 실행도 남으므로 **기록이 끊긴 구간이 곧 스케줄러가 멈춘 구간**이다.

## 첫 드롭을 열 때

`DROP_CHECKLIST.md` 를 따른다. 시작 전 조건, 진행 중 점검, 마감 직후 확인,
성공 지표 쿼리, 롤백 조건이 순서대로 있다.

## 코드 밖에서 막혀 있는 것

PRD 가 스스로 "1단계 착수 전"으로 못박은 것들이다. 코드 진도와 무관하게 남아 있다.

- **겸업·이해충돌 정리** — 결과에 따라 카테고리나 서비스 성격 자체가 바뀔 수 있다
- **통신판매중개업 신고, PG 가맹점 심사**
- **시작 카테고리 결정** (웹툰·일러스트 vs 보드게임·TRPG)
- **창작자 리셀 정책** — 원작자가 리셀 중단을 요청할 때의 처리 기준

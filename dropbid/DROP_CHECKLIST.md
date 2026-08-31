# 비공개 드롭 운영 체크리스트 (릴리즈 1단계)

PRD 릴리즈 계획 1단계 — 초대된 판매자 5~10명, 상품 10~20개, **실제 결제 포함**.
실제 환경에서 전 과정을 1회 완주한 리허설(2026-08-31)을 바탕으로 쓴다.

## 시작 전 — 이게 하나라도 안 됐으면 열지 않는다

- [ ] **겸업·이해충돌 정리 완료.** 회사 결정이 문서로 남아 있는가
- [ ] 통신판매중개업 신고, PG 가맹점 심사 통과
- [ ] 카카오 알림톡 발신 프로필·템플릿 승인 (며칠 걸린다. 가장 먼저 신청)
- [ ] 시작 카테고리 확정 (웹툰·일러스트 vs 보드게임·TRPG)
- [ ] 창작자 리셀 중단 요청 시 처리 기준 문서화
- [ ] `npm test` 전부 통과, CI 초록불
- [ ] Supabase 보안 점검(`get_advisors`) ERROR 0건
- [ ] 마이그레이션이 프로덕션에 전부 적용됨 (`README.md` 절차)
- [ ] **백업 시점 확인.** 실제 결제가 오가므로 되돌릴 지점이 있어야 한다

## 회차 여는 날

- [ ] 드롭 회차 생성 — 시작·마감 시각을 **한국 시간 기준**으로 확인
- [ ] 초대 판매자에게 등록 안내. 등록은 마감 며칠 전까지 받는다
- [ ] `/admin` 에서 전건 검수. 후원 인증 이미지를 **한 건씩 눈으로** 본다
- [ ] 승인된 상품이 의도한 회차에 배정됐는지 확인
- [ ] 마감 스케줄러가 돌고 있는지 확인

```sql
select ran_at, processed, detail from scheduler_runs
 where job = 'close_due_auctions' order by ran_at desc limit 10;
```

**기록이 1분 간격으로 끊김 없이 이어져야 한다.** 끊긴 구간이 곧 멈춘 구간이다.

## 드롭 진행 중 — 30분마다 본다

- [ ] 스케줄러 기록이 계속 이어지는가
- [ ] `/admin` 맨 위에 "확인이 필요한 경매" 가 떠 있지 않은가
- [ ] 마감 임박 경매의 연장 횟수가 20회 상한에 붙지 않았는가

```sql
select p.title, a.current_price, a.extension_count, a.ends_at
  from auctions a join products p on p.id = a.product_id
 where a.status = 'live' order by a.ends_at;
```

## 마감 직후 — 여기가 가장 중요하다

- [ ] 모든 경매가 `live` 를 벗어났는가 (`sold` / `unsold` / `needs_operator`)
- [ ] 낙찰 건마다 주문이 하나씩 생겼는가
- [ ] 알림이 적재됐는가. **발송 모듈이 없으면 이 단계는 수동 연락으로 대체한다**

```sql
select a.status, count(*) from auctions a group by a.status;
select count(*) filter (where status='pending') as 결제대기 from orders;
select kind, status, count(*) from notifications group by kind, status;
```

## 24시간 뒤 — 결제 마감

- [ ] 결제 완료 건 → 판매자에게 배송 요청
- [ ] 미결제 건이 `payment_failed` 로 넘어갔는가
- [ ] 정산은 **운영자가 수동 이체** (PRD 범위 밖으로 뒀다)

## 회차가 끝나면 — 성공 지표 두 개

PRD 가 정한 지표는 이 둘뿐이다. 방문자수·등록수는 성패 판정에 쓰지 않는다.

```sql
-- 경매 성립률: 유니크 입찰자 2명 이상인 경매 / 마감된 경매
select count(*) filter (
         where (select count(distinct b.bidder_id) from bids b
                 where b.auction_id = a.id and b.outcome = 'accepted') >= 2
       )::float / nullif(count(*), 0) as 성립률
  from auctions a where a.status in ('sold','unsold','payment_failed');

-- 낙찰 후 미결제율
select count(*) filter (where status = 'failed')::float
       / nullif(count(*), 0) as 미결제율
  from orders;
```

## 롤백 조건 — 하나라도 걸리면 공개를 중단한다

PRD 릴리즈 계획에 적힌 그대로다.

- **동시 입찰 인수 조건 미통과** → `npm test` 의 동시성 테스트가 감시한다
- **마감 처리 누락 1건 이상** → 스케줄러 기록이 끊겼거나 `live` 로 남은 경매가 있으면 해당

## 스케줄러를 멈춰야 할 때

```sql
select cron.unschedule('close-due-auctions');
```

멈추면 경매가 마감되지 않고 계속 `live` 로 남는다. **입찰은 마감 시각이 지나면
`place_bid` 가 거부하므로 되살아나지는 않는다.** 원인을 고친 뒤 다시 걸면 밀린 건이
한 번에 처리된다 (멱등이라 중복 확정은 없다).

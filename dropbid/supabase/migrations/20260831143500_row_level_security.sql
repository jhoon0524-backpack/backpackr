-- 행 수준 보안. 여기가 없으면 브라우저 키만으로 남의 연락처와 결제 정보를 읽을 수 있다.
--
-- 앞선 권한 마이그레이션은 "쓰기" 만 막았다. 읽기는 열어 뒀는데,
-- 경매·상품처럼 원래 공개인 것과 연락처·주문처럼 본인만 봐야 하는 것을 구분하지 않았다.
-- Supabase 보안 점검(get_advisors)이 8개 테이블 전부를 ERROR 로 잡아 알게 됐다.
--
-- 서버 라우트는 service_role 로 붙고, 그 역할은 RLS 를 통과한다. 앱 동작에는 영향이 없다.

alter table drops        enable row level security;
alter table products     enable row level security;
alter table auctions     enable row level security;
alter table bids         enable row level security;
alter table profiles     enable row level security;
alter table orders       enable row level security;
alter table notifications enable row level security;
alter table scheduler_runs enable row level security;

-- 공개해도 되는 것 — 경매를 보려면 누구나 읽을 수 있어야 한다.
create policy "회차는 누구나 본다" on drops for select to anon, authenticated using (true);
create policy "경매는 누구나 본다" on auctions for select to anon, authenticated using (true);
create policy "입찰 기록은 누구나 본다" on bids for select to anon, authenticated using (true);

-- 상품은 검수를 통과한 것만 보인다. 대기·반려 중인 것은 판매자 본인만 본다.
create policy "공개된 상품은 누구나 본다" on products for select to anon, authenticated
  using (status = 'scheduled');
create policy "판매자는 자기 상품을 본다" on products for select to authenticated
  using (seller_id = auth.uid());

-- 본인 것만 — 연락처가 들어 있다.
create policy "프로필은 본인만 본다" on profiles for select to authenticated
  using (id = auth.uid());

-- 주문은 산 사람과 판 사람만.
create policy "주문은 당사자만 본다" on orders for select to authenticated
  using (
    buyer_id = auth.uid()
    or exists (
      select 1 from auctions a join products p on p.id = a.product_id
       where a.id = orders.auction_id and p.seller_id = auth.uid()
    )
  );

create policy "알림은 본인만 본다" on notifications for select to authenticated
  using (user_id = auth.uid());

-- scheduler_runs 는 운영 기록이라 정책을 만들지 않는다. service_role 만 본다.

-- 함수의 search_path 를 고정한다. 호출자가 스키마를 바꿔치기해 다른 함수를 부르게 하는 것을 막는다.
alter function bid_increment(integer)               set search_path = public, pg_temp;
alter function place_bid(uuid, uuid, integer)       set search_path = public, pg_temp;
alter function close_due_auctions()                 set search_path = public, pg_temp;
alter function expire_unpaid_orders()               set search_path = public, pg_temp;
alter function start_due_drops()                    set search_path = public, pg_temp;
alter function run_close_due_auctions()             set search_path = public, pg_temp;
alter function approve_product(uuid, uuid)          set search_path = public, pg_temp;
alter function reject_product(uuid, text)           set search_path = public, pg_temp;

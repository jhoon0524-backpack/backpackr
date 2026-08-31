-- 시연용 데이터. 화면이 도는 것을 눈으로 보기 위한 것이다. 프로덕션에는 절대 넣지 않는다.
--
--   npm run db:seed

-- 다시 실행할 수 있어야 한다. 시연 중 몇 번이고 되돌리게 된다.
truncate bids, orders, notifications, auctions, products, drops, profiles, scheduler_runs cascade;
delete from auth.users;

-- 사람 (로그인이 아직 없어서 화면에서 골라 쓴다)
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000003'),
  ('aaaaaaaa-0000-0000-0000-000000000004'),
  ('aaaaaaaa-0000-0000-0000-000000000009');

insert into profiles (id, nickname, phone, is_operator) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '김창작', '010-1111-1111', false),
  ('aaaaaaaa-0000-0000-0000-000000000002', '이수집', '010-2222-2222', false),
  ('aaaaaaaa-0000-0000-0000-000000000003', '박덕후', '010-3333-3333', false),
  ('aaaaaaaa-0000-0000-0000-000000000004', '최신규 (연락처 미등록)', null, false),
  ('aaaaaaaa-0000-0000-0000-000000000009', '운영자', '010-9999-9999', true);

-- 이번 회차: 지금 시작해서 2시간 뒤 동시 마감
insert into drops (id, round_number, starts_at, ends_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 1, now() - interval '1 hour', now() + interval '2 hours');

insert into products (id, seller_id, title, funding_project_name, funding_project_url,
                      category, condition_grade,
                      photo_urls, backer_proof_url, start_price)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   '미공개 일러스트집 <새벽 산책> 한정판', '새벽 산책 아트북 펀딩',
   'https://example.com/projects/dawn-walk', '웹툰·일러스트', 'A',
   array['data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23f4e3d7%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%238a5a3b%22%20text-anchor%3D%22middle%22%3E%EC%95%84%ED%8A%B8%EB%B6%81%20%ED%91%9C%EC%A7%80%3C/text%3E%3C/svg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23efe0f0%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%236b4a72%22%20text-anchor%3D%22middle%22%3E%EB%82%B4%EC%A7%80%201%3C/text%3E%3C/svg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23e3ecf5%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%233f5c78%22%20text-anchor%3D%22middle%22%3E%EB%82%B4%EC%A7%80%202%3C/text%3E%3C/svg%3E'], 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23fff4d6%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%238a6d1f%22%20text-anchor%3D%22middle%22%3E%ED%9B%84%EC%9B%90%20%EC%9D%B8%EC%A6%9D%20%EC%BA%A1%EC%B2%98%3C/text%3E%3C/svg%3E', 45000),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   '보드게임 <달빛 상단> 확장팩 세트', '달빛 상단 확장 펀딩',
   'https://example.com/projects/moonlit', '웹툰·일러스트', 'B',
   array['data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23e8f0e3%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%234a6b3b%22%20text-anchor%3D%22middle%22%3E%EA%B5%AC%EC%84%B1%ED%92%88%20%EC%A0%84%EC%B2%B4%3C/text%3E%3C/svg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23f5efdc%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%237a6a3b%22%20text-anchor%3D%22middle%22%3E%EC%B9%B4%EB%93%9C%3C/text%3E%3C/svg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23e3e8f0%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%23455571%22%20text-anchor%3D%22middle%22%3E%EB%B0%95%EC%8A%A4%3C/text%3E%3C/svg%3E'], 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23fff4d6%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%238a6d1f%22%20text-anchor%3D%22middle%22%3E%ED%9B%84%EC%9B%90%20%EC%9D%B8%EC%A6%9D%20%EC%BA%A1%EC%B2%98%3C/text%3E%3C/svg%3E', 28000),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
   '아크릴 스탠드 풀세트 (7종)', '고양이 다방 굿즈 펀딩',
   null, '웹툰·일러스트', 'A',
   array['data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23fbe9ef%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%238c4a63%22%20text-anchor%3D%22middle%22%3E7%EC%A2%85%20%EC%A0%84%EC%B2%B4%3C/text%3E%3C/svg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23eef2e9%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%235a6b45%22%20text-anchor%3D%22middle%22%3E%EB%82%B1%EA%B0%9C%3C/text%3E%3C/svg%3E','data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23e9eef5%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%23455571%22%20text-anchor%3D%22middle%22%3E%EB%92%B7%EB%A9%B4%3C/text%3E%3C/svg%3E'], 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23fff4d6%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%238a6d1f%22%20text-anchor%3D%22middle%22%3E%ED%9B%84%EC%9B%90%20%EC%9D%B8%EC%A6%9D%20%EC%BA%A1%EC%B2%98%3C/text%3E%3C/svg%3E', 12000);

-- 승인 → 배정 → 라이브
select approve_product(p.id, 'bbbbbbbb-0000-0000-0000-000000000001') from products p;
select start_due_drops();

-- 경합이 붙은 것처럼 몇 건 넣어 둔다
select place_bid(a.id, 'aaaaaaaa-0000-0000-0000-000000000002', 45000)
  from auctions a join products p on p.id = a.product_id
 where p.title like '미공개 일러스트집%';
select place_bid(a.id, 'aaaaaaaa-0000-0000-0000-000000000003', 50000)
  from auctions a join products p on p.id = a.product_id
 where p.title like '미공개 일러스트집%';
select place_bid(a.id, 'aaaaaaaa-0000-0000-0000-000000000002', 28000)
  from auctions a join products p on p.id = a.product_id
 where p.title like '보드게임%';

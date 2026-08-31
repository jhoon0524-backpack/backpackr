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
   array['1','2','3'], 'proof', 45000),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   '보드게임 <달빛 상단> 확장팩 세트', '달빛 상단 확장 펀딩',
   'https://example.com/projects/moonlit', '웹툰·일러스트', 'B',
   array['1','2','3'], 'proof', 28000),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
   '아크릴 스탠드 풀세트 (7종)', '고양이 다방 굿즈 펀딩',
   null, '웹툰·일러스트', 'A',
   array['1','2','3'], 'proof', 12000);

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

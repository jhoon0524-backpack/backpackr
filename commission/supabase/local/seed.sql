-- 시연용 데이터. 화면이 도는 것을 눈으로 보기 위한 것이다. 프로덕션에는 절대 넣지 않는다.
--
--   npm run db:seed

-- 다시 실행할 수 있어야 한다. 시연 중 몇 번이고 되돌리게 된다.
truncate requests, commissions, profiles cascade;
delete from auth.users;

-- 사람 (로그인이 아직 없어서 화면에서 골라 쓴다)
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000003'),
  ('aaaaaaaa-0000-0000-0000-000000000004');

insert into profiles (id, nickname, bio) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '김창작',
   '수채화 느낌의 인물 일러스트를 그립니다. 텀블벅에서 아트북 두 권을 펀딩했어요.'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '이글꼴',
   '로고와 타이포그래피. 독립 출판 표지 작업을 주로 합니다.'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '박덕후', null),
  ('aaaaaaaa-0000-0000-0000-000000000004', '최의뢰', null);

insert into commissions (id, creator_id, title, description, category, price, turnaround_days,
                         max_slots, sample_urls, status)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   '수채 느낌 반신 일러스트',
   E'캐릭터 한 명 반신, 단색 배경입니다.\n의상·소품 추가는 최종가에서 조정합니다.\n상업적 이용은 별도 문의해 주세요.',
   '일러스트', 60000, 14, 3,
   array['data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23f4e3d7%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%238a5a3b%22%20text-anchor%3D%22middle%22%3E%EC%83%98%ED%94%8C%201%3C/text%3E%3C/svg%3E',
         'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23e3ecf5%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%233f5c78%22%20text-anchor%3D%22middle%22%3E%EC%83%98%ED%94%8C%202%3C/text%3E%3C/svg%3E'],
   'open'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   '전신 일러스트 + 간단 배경',
   E'전신 1인, 배경은 간단한 풍경까지. 2인부터는 인당 40,000원 추가.',
   '일러스트', 120000, 21, 1,
   array['data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23efe0f0%22/%3E%3Ctext%20x%3D%22200%22%20y%3D%22210%22%20font-family%3D%22sans-serif%22%20font-size%3D%2234%22%20fill%3D%22%236b4a72%22%20text-anchor%3D%22middle%22%3E%EC%A0%84%EC%8B%A0%20%EC%83%98%ED%94%8C%3C/text%3E%3C/svg%3E'],
   'open'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002',
   '독립출판 표지 로고·타이틀',
   E'책 제목 레터링과 표지용 로고. 시안 2종 중 택1, 수정 2회 포함.',
   '로고·타이포', 150000, 10, 2,
   '{}',
   'open'),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002',
   '(마감) SNS 프로필 로고',
   E'이번 달은 마감했습니다.',
   '로고·타이포', 40000, 5, 2,
   '{}',
   'closed');

-- 의뢰 몇 건. 진행 중인 것이 있어야 슬롯 표시와 마이페이지가 보인다.
select submit_request('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003',
  '검은 단발에 안경 쓴 여성 캐릭터, 카페에서 책 읽는 분위기로 부탁드립니다. 옷은 베이지 니트.', null);
select submit_request('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000004',
  '제 D&D 캐릭터(엘프 궁수)입니다. 참고 링크에 캐릭터 시트가 있습니다.', 'https://example.com/sheet');
select submit_request('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000004',
  '커플 전신 일러스트, 벚꽃 배경으로 부탁드려요. 얼굴 사진은 수락 후 보내드릴게요.', null);
select submit_request('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003',
  '에세이집 <새벽 산책> 표지 타이틀. 손글씨 느낌보다는 단정한 세리프 쪽이 좋습니다.', null);

-- 첫 번째는 수락해 두고, 두 번째 커미션(슬롯 1)은 꽉 찬 상태를 보여준다.
select accept_request(r.id, 'aaaaaaaa-0000-0000-0000-000000000001', 60000)
  from requests r where r.client_id = 'aaaaaaaa-0000-0000-0000-000000000003'
   and r.commission_id = 'cccccccc-0000-0000-0000-000000000001';
select accept_request(r.id, 'aaaaaaaa-0000-0000-0000-000000000001', 160000)
  from requests r where r.commission_id = 'cccccccc-0000-0000-0000-000000000002';

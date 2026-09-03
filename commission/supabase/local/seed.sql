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

-- 펀딩 이력 숫자는 **전부 더미다.** 표시 규칙 세 갈래를 다 밟아 보려고 일부러 다르게 넣었다.
--   김창작 — 응답 312명 → 후원자와 만족도 둘 다 보인다
--   글자공방 — 응답 12명(기준 30 미만) → 후원자만 보이고 만족도는 숨는다
--   박덕후·최의뢰 — 이력 없음 → 아무것도 안 보인다 ("이력 없음" 이라고 쓰지 않는다)
insert into profiles (id, nickname, bio, backer_count, satisfaction, satisfaction_count, follower_count) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '김창작',
   '수채화 느낌의 인물 일러스트를 그립니다. 텀블벅에서 아트북 두 권을 펀딩했어요.',
   1240, 4.8, 312, 820),
  ('aaaaaaaa-0000-0000-0000-000000000002', '글자공방',
   '로고와 타이포그래피. 독립 출판 표지 작업을 주로 합니다.',
   340, 4.9, 12, 210),
  ('aaaaaaaa-0000-0000-0000-000000000003', '박덕후', null, 0, null, 0, 0),
  ('aaaaaaaa-0000-0000-0000-000000000004', '최의뢰', null, 0, null, 0, 0);

insert into commissions (id, creator_id, title, description, category, price, turnaround_days,
                         max_slots, sample_urls, status)
values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   '수채 느낌 반신 일러스트',
   E'캐릭터 한 명 반신, 단색 배경입니다.\n의상·소품 추가는 최종가에서 조정합니다.\n상업적 이용은 별도 문의해 주세요.',
   '일러스트', 60000, 14, 3,
   array[]::text[],
   'open'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   '전신 일러스트 + 간단 배경',
   E'전신 1인, 배경은 간단한 풍경까지. 2인부터는 인당 40,000원 추가.',
   '일러스트', 120000, 21, 1,
   array[]::text[],
   'open'),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002',
   '독립출판 표지 로고·타이틀',
   E'책 제목 레터링과 표지용 로고. 시안 2종 중 택1, 수정 2회 포함.',
   '로고·타이포', 150000, 10, 2,
   array[]::text[],
   'open'),
  ('cccccccc-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000002',
   'SNS 프로필 로고',
   E'이번 달은 닫아 두었습니다.',
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

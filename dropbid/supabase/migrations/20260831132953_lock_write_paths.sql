-- 입찰과 경매에 직접 쓰는 길을 권한으로 막는다 (PRD 인수 조건).
-- 규칙을 코드 리뷰로만 지키면 언젠가 샌다. DB 가 거절하게 만든다.

-- 브라우저가 들고 있는 키로 오는 역할. 읽기만 남긴다.
revoke insert, update, delete, truncate on bids from anon, authenticated;
revoke insert, update, delete, truncate on auctions from anon, authenticated;

-- place_bid 는 user_id 를 인자로 받는다. 브라우저가 직접 부르면 남의 이름으로 입찰할 수 있다.
-- 서버 라우트(service_role)만 부른다.
revoke all on function place_bid(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function close_due_auctions() from public, anon, authenticated;
grant execute on function place_bid(uuid, uuid, integer) to service_role;
grant execute on function close_due_auctions() to service_role;

-- 인상폭은 화면도 알아야 한다. 읽기 전용 계산이라 열어 둔다.
grant execute on function bid_increment(integer) to anon, authenticated, service_role;

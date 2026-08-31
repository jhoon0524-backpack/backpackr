-- 연락처가 없으면 입찰을 막는다 (PRD 계정).
--
-- API 가 아니라 place_bid 에 넣는다. 입찰의 유일한 통로가 여기라서,
-- 여기 없으면 규칙이 아니라 권고가 된다.

alter table bids drop constraint bids_reject_reason_check;
alter table bids add constraint bids_reject_reason_check check (reject_reason in (
  'not_live',
  'seller_cannot_bid',
  'already_highest',
  'amount_too_low',
  'no_phone'            -- 연락처 미등록
));

create or replace function place_bid(p_auction_id uuid, p_user_id uuid, p_amount integer)
returns jsonb
language plpgsql
as $$
declare
  v_auction auctions;
  v_seller_id uuid;
  v_has_phone boolean;
  v_has_bids boolean;
  v_min_amount integer;
  v_reason text;
  v_extended boolean := false;
begin
  -- 행 잠금. 같은 경매에 동시에 들어온 입찰은 여기서 한 줄로 세워진다.
  select * into v_auction from auctions where id = p_auction_id for update;
  if not found then
    raise exception '없는 경매다: %', p_auction_id;
  end if;

  select seller_id into v_seller_id from products where id = v_auction.product_id;
  select phone is not null into v_has_phone from profiles where id = p_user_id;

  -- 아직 입찰이 없으면 시작가 그대로가 최소 금액이다. 첫 입찰자가 시작가보다 더 내야 할 이유는 없다.
  -- highest_bidder_id 로 판단하면 안 된다 — 최고입찰자가 계정을 지우면 null 이 되기 때문이다.
  v_has_bids := exists (
    select 1 from bids where auction_id = p_auction_id and outcome = 'accepted'
  );
  if v_has_bids then
    v_min_amount := v_auction.current_price + bid_increment(v_auction.current_price);
  else
    v_min_amount := v_auction.current_price;
  end if;

  -- PRD 의 거부 순서 그대로. 연락처 확인만 앞에 둔다 — 경매 상태와 무관하게 자격의 문제다.
  if not coalesce(v_has_phone, false) then
    v_reason := 'no_phone';
  elsif v_auction.status <> 'live' or now() >= v_auction.ends_at then
    -- 마감 시각이 지났는데 아직 live 인 경우도 막는다. 스케줄러는 1분 주기라 늦을 수 있다.
    v_reason := 'not_live';
  elsif v_seller_id = p_user_id then
    v_reason := 'seller_cannot_bid';
  elsif v_auction.highest_bidder_id = p_user_id then
    v_reason := 'already_highest';
  elsif p_amount < v_min_amount then
    v_reason := 'amount_too_low';
  end if;

  -- 거부도 기록으로 남긴다 (PRD 인수 조건). 그래서 예외를 던지지 않고 결과로 돌려준다.
  if v_reason is not null then
    insert into bids (auction_id, bidder_id, amount, outcome, reject_reason)
    values (p_auction_id, p_user_id, p_amount, 'rejected', v_reason);

    return jsonb_build_object(
      'outcome', 'rejected',
      'reject_reason', v_reason,
      'current_price', v_auction.current_price,
      'min_next_amount', v_min_amount,
      'ends_at', v_auction.ends_at,
      'extended', false
    );
  end if;

  insert into bids (auction_id, bidder_id, amount, outcome)
  values (p_auction_id, p_user_id, p_amount, 'accepted');

  -- 마감 임박이면 마감 시각을 30초 뒤로 민다. 경매당 20회까지.
  v_extended := (v_auction.ends_at - now() < interval '30 seconds')
                and v_auction.extension_count < 20;

  update auctions
     set current_price = p_amount,
         highest_bidder_id = p_user_id,
         ends_at = case when v_extended then ends_at + interval '30 seconds' else ends_at end,
         extension_count = case when v_extended then extension_count + 1 else extension_count end
   where id = p_auction_id
   returning * into v_auction;

  return jsonb_build_object(
    'outcome', 'accepted',
    'reject_reason', null,
    'current_price', v_auction.current_price,
    'min_next_amount', v_auction.current_price + bid_increment(v_auction.current_price),
    'ends_at', v_auction.ends_at,
    'extended', v_extended
  );
end;
$$;

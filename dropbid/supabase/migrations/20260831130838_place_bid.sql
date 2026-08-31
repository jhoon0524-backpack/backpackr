-- 입찰의 유일한 통로. 애플리케이션은 이 함수만 호출하고 bids/auctions 에 직접 쓰지 않는다.
--
-- 주의: user_id 를 인자로 받는다. 브라우저가 직접 호출하면 남의 이름으로 입찰할 수 있으므로,
-- 서버 라우트가 인증된 사용자 id 를 넣어 호출해야 한다. 권한은 별도 마이그레이션에서 잠근다.

-- 최소 인상폭. 화면도 같은 값을 보여줘야 해서 함수로 뺐다.
create function bid_increment(price integer) returns integer
language sql immutable as $$
  select case
    when price < 10000 then 500
    when price < 50000 then 1000
    else 5000
  end;
$$;

create function place_bid(p_auction_id uuid, p_user_id uuid, p_amount integer)
returns jsonb
language plpgsql
as $$
declare
  v_auction auctions;
  v_seller_id uuid;
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

  -- PRD 의 거부 순서 그대로.
  if v_auction.status <> 'live' or now() >= v_auction.ends_at then
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

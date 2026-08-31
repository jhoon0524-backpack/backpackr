-- 마감 처리. 1분 주기 스케줄러가 부른다.
--
-- 멱등이다. 이미 sold/unsold 인 경매는 status 조건에서 걸러지므로 두 번 돌려도 한 번만 확정된다.
-- 낙찰이면 결제 기한 24시간짜리 주문을 같은 트랜잭션에서 만든다.
-- 처리한 것을 돌려주므로 스케줄러가 실행·처리 건수를 기록할 수 있다 (PRD 인수 조건).

create function close_due_auctions()
returns table (auction_id uuid, result text)
language plpgsql as $$
-- 반환 컬럼명 auction_id 가 orders.auction_id 와 겹친다. 이름이 겹치면 컬럼으로 읽는다.
#variable_conflict use_column
begin
  return query
  with due as (
    -- skip locked 라 스케줄러가 겹쳐 돌아도 같은 경매를 두 번 잡지 않는다.
    select a.id, a.highest_bidder_id, a.current_price,
           exists (select 1 from bids b
                    where b.auction_id = a.id and b.outcome = 'accepted') as has_bids
      from auctions a
     where a.status = 'live' and a.ends_at <= now()
       for update skip locked
  ), sold as (
    update auctions a
       set status = 'sold', winner_id = d.highest_bidder_id
      from due d
     where a.id = d.id and d.highest_bidder_id is not null
    returning a.id, a.winner_id, a.current_price
  ), unsold as (
    update auctions a
       set status = 'unsold'
      from due d
     where a.id = d.id and not d.has_bids
    returning a.id
  ), new_orders as (
    insert into orders (auction_id, buyer_id, amount, due_at)
    select s.id, s.winner_id, s.current_price, now() + interval '24 hours'
      from sold s
    on conflict (auction_id) do nothing
    returning orders.auction_id
  )
  select s.id, 'sold' from sold s
  union all
  select u.id, 'unsold' from unsold u
  union all
  -- 입찰은 있는데 최고입찰자가 없다. 그 사람이 계정을 지웠다는 뜻이다.
  -- 낙찰 자격은 살아 있으나 결제할 상대가 없으므로 자동으로 확정하지 않고 운영자에게 넘긴다.
  -- 마감 시각이 지났으므로 place_bid 가 새 입찰을 받지 않는다. 그대로 둬도 되살아나지 않는다.
  select d.id, 'needs_operator'
    from due d
   where d.highest_bidder_id is null and d.has_bids;
end;
$$;

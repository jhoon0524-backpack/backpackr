-- 상태가 바뀌는 그 트랜잭션에서 보낼 알림을 함께 적재한다.
-- 따로 훑어서 만들면 "바뀌었는데 알림이 없는" 틈이 생긴다.

create or replace function close_due_auctions()
returns table (auction_id uuid, result text)
language plpgsql as $$
#variable_conflict use_column
begin
  return query
  with due as (
    -- skip locked 라 스케줄러가 겹쳐 돌아도 같은 경매를 두 번 잡지 않는다.
    select a.id, a.highest_bidder_id, a.current_price, a.product_id,
           exists (select 1 from bids b
                    where b.auction_id = a.id and b.outcome = 'accepted') as has_bids
      from auctions a
     where a.status = 'live' and a.ends_at <= now()
       for update of a skip locked
  ), sold as (
    update auctions a
       set status = 'sold', winner_id = d.highest_bidder_id
      from due d
     where a.id = d.id and d.highest_bidder_id is not null
    returning a.id, a.winner_id, a.current_price, a.product_id
  ), unsold as (
    update auctions a
       set status = 'unsold'
      from due d
     where a.id = d.id and not d.has_bids
    returning a.id, a.product_id
  ), new_orders as (
    insert into orders (auction_id, buyer_id, amount, due_at)
    select s.id, s.winner_id, s.current_price, now() + interval '24 hours'
      from sold s
    on conflict (auction_id) do nothing
    returning orders.auction_id
  ), notify_winner as (
    insert into notifications (auction_id, user_id, kind)
    select s.id, s.winner_id, 'won' from sold s
    on conflict (auction_id, user_id, kind) where auction_id is not null do nothing
    returning 1
  ), notify_seller_sold as (
    insert into notifications (auction_id, user_id, kind)
    select s.id, p.seller_id, 'sold' from sold s join products p on p.id = s.product_id
    on conflict (auction_id, user_id, kind) where auction_id is not null do nothing
    returning 1
  ), notify_seller_unsold as (
    insert into notifications (auction_id, user_id, kind)
    select u.id, p.seller_id, 'unsold' from unsold u join products p on p.id = u.product_id
    on conflict (auction_id, user_id, kind) where auction_id is not null do nothing
    returning 1
  )
  select s.id, 'sold' from sold s
  union all
  select u.id, 'unsold' from unsold u
  union all
  -- 입찰은 있는데 최고입찰자가 없다. 그 사람이 계정을 지웠다는 뜻이다.
  -- 낙찰 자격은 살아 있으나 결제할 상대가 없으므로 자동으로 확정하지 않고 운영자에게 넘긴다.
  select d.id, 'needs_operator'
    from due d
   where d.highest_bidder_id is null and d.has_bids;
end;
$$;

create or replace function expire_unpaid_orders()
returns table (order_id uuid, auction_id uuid)
language plpgsql as $$
#variable_conflict use_column
begin
  return query
  with due as (
    select o.id, o.auction_id
      from orders o
     where o.status = 'pending' and o.due_at <= now()
       for update of o skip locked
  ), failed_orders as (
    update orders o set status = 'failed'
      from due d where o.id = d.id
    returning o.id, o.auction_id
  ), failed_auctions as (
    -- 경매도 payment_failed 로 넘긴다. 판매자 화면이 경매 상태로 판단한다.
    update auctions a set status = 'payment_failed'
      from failed_orders f where a.id = f.auction_id
    returning a.id, a.product_id
  ), notify_seller as (
    insert into notifications (auction_id, user_id, kind)
    select fa.id, p.seller_id, 'payment_failed'
      from failed_auctions fa join products p on p.id = fa.product_id
    on conflict (auction_id, user_id, kind) where auction_id is not null do nothing
    returning 1
  )
  select f.id, f.auction_id from failed_orders f;
end;
$$;

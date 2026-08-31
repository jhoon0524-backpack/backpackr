-- 남은 알림 세 종류를 적재한다: 상위 입찰 / 결제 기한 임박 / 검수 반려.
--
-- 상위 입찰은 다른 셋과 성질이 다르다. 한 사람이 같은 경매에서 여러 번 밀릴 수 있으므로
-- "경매당 한 번" 유니크에서 빼야 한다. 나머지는 스케줄러가 반복 호출하므로 유니크가 필요하다.
--
-- 반려 알림은 경매가 생기기 전에 일어난다. 어느 상품이 반려됐는지 알아야 보낼 수 있으므로
-- product_id 를 둔다.

alter table notifications add column product_id uuid references products (id);

drop index notifications_once_per_event_idx;

-- 경매에 딸린 알림: 경매·수신자·종류당 한 줄. 단 상위 입찰은 제외한다.
create unique index notifications_once_per_auction_idx
  on notifications (auction_id, user_id, kind)
  where auction_id is not null and kind <> 'outbid';

-- 상품에 딸린 알림(반려): 상품·수신자·종류당 한 줄.
create unique index notifications_once_per_product_idx
  on notifications (product_id, user_id, kind)
  where product_id is not null;

-- ── 상위 입찰 ────────────────────────────────────────────────
-- place_bid 안에서 적재한다. 직전 최고입찰자를 알 수 있는 유일한 지점이다.
create or replace function place_bid(p_auction_id uuid, p_user_id uuid, p_amount integer)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_auction auctions;
  v_seller_id uuid;
  v_has_phone boolean;
  v_has_bids boolean;
  v_min_amount integer;
  v_reason text;
  v_extended boolean := false;
  v_previous_top uuid;
begin
  select * into v_auction from auctions where id = p_auction_id for update;
  if not found then
    raise exception '없는 경매다: %', p_auction_id;
  end if;

  select seller_id into v_seller_id from products where id = v_auction.product_id;
  select phone is not null into v_has_phone from profiles where id = p_user_id;

  v_has_bids := exists (
    select 1 from bids where auction_id = p_auction_id and outcome = 'accepted'
  );
  if v_has_bids then
    v_min_amount := v_auction.current_price + bid_increment(v_auction.current_price);
  else
    v_min_amount := v_auction.current_price;
  end if;

  if not coalesce(v_has_phone, false) then
    v_reason := 'no_phone';
  elsif v_auction.status <> 'live' or now() >= v_auction.ends_at then
    v_reason := 'not_live';
  elsif v_seller_id = p_user_id then
    v_reason := 'seller_cannot_bid';
  elsif v_auction.highest_bidder_id = p_user_id then
    v_reason := 'already_highest';
  elsif p_amount < v_min_amount then
    v_reason := 'amount_too_low';
  end if;

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

  -- 밀려나는 사람. 갱신 전에 잡아둔다.
  v_previous_top := v_auction.highest_bidder_id;

  insert into bids (auction_id, bidder_id, amount, outcome)
  values (p_auction_id, p_user_id, p_amount, 'accepted');

  v_extended := (v_auction.ends_at - now() < interval '30 seconds')
                and v_auction.extension_count < 20;

  update auctions
     set current_price = p_amount,
         highest_bidder_id = p_user_id,
         ends_at = case when v_extended then ends_at + interval '30 seconds' else ends_at end,
         extension_count = case when v_extended then extension_count + 1 else extension_count end
   where id = p_auction_id
   returning * into v_auction;

  -- 직전 최고입찰자에게 알린다. 본인이 본인을 밀어내는 경우는 위에서 이미 거부됐다.
  if v_previous_top is not null then
    insert into notifications (auction_id, user_id, kind)
    values (p_auction_id, v_previous_top, 'outbid');
  end if;

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

-- ── 검수 반려 ────────────────────────────────────────────────
create or replace function reject_product(p_product_id uuid, p_reason text)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_seller_id uuid;
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception '반려 사유가 있어야 한다';
  end if;

  update products
     set status = 'rejected', rejection_reason = p_reason
   where id = p_product_id and status = 'pending'
  returning seller_id into v_seller_id;

  if not found then
    raise exception '검수 대기 중인 상품이 아니다: %', p_product_id;
  end if;

  insert into notifications (product_id, user_id, kind)
  values (p_product_id, v_seller_id, 'product_rejected')
  on conflict (product_id, user_id, kind) where product_id is not null do nothing;
end;
$$;

-- ── 결제 기한 임박 ───────────────────────────────────────────
-- 기한 3시간 전부터 적재한다. 유니크 인덱스가 있어 매분 돌아도 한 번만 들어간다.
create function notify_payment_due()
returns table (order_id uuid)
language plpgsql
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
  with due_soon as (
    select o.id, o.auction_id, o.buyer_id
      from orders o
     where o.status = 'pending'
       and o.buyer_id is not null
       and o.due_at <= now() + interval '3 hours'
       and o.due_at > now()
  ), notified as (
    insert into notifications (auction_id, user_id, kind)
    select d.auction_id, d.buyer_id, 'payment_due' from due_soon d
    on conflict (auction_id, user_id, kind) where auction_id is not null and kind <> 'outbid'
      do nothing
    returning notifications.auction_id
  )
  select d.id from due_soon d
   where d.auction_id in (select auction_id from notified);
end;
$$;

revoke all on function notify_payment_due() from public, anon, authenticated;
grant execute on function notify_payment_due() to service_role;

-- 스케줄러에 태운다.
create or replace function run_close_due_auctions()
returns scheduler_runs
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_detail jsonb;
  v_processed integer;
  v_expired integer;
  v_started integer;
  v_due_soon integer;
  v_run scheduler_runs;
begin
  select count(*) into v_started from start_due_drops();

  with closed as (
    select result from close_due_auctions()
  )
  select coalesce(jsonb_object_agg(result, n), '{}'::jsonb),
         coalesce(sum(n) filter (where result <> 'needs_operator'), 0)
    into v_detail, v_processed
    from (select result, count(*) as n from closed group by result) t;

  select count(*) into v_expired from expire_unpaid_orders();
  select count(*) into v_due_soon from notify_payment_due();

  if v_started > 0 then
    v_detail := v_detail || jsonb_build_object('started', v_started);
  end if;
  if v_expired > 0 then
    v_detail := v_detail || jsonb_build_object('payment_failed', v_expired);
  end if;
  if v_due_soon > 0 then
    v_detail := v_detail || jsonb_build_object('payment_due', v_due_soon);
  end if;

  insert into scheduler_runs (job, processed, detail)
  values ('close_due_auctions', v_started + v_processed + v_expired + v_due_soon, v_detail)
  returning * into v_run;

  return v_run;
end;
$$;

-- 인덱스 조건이 바뀌었으므로 기존 함수들의 on conflict 절도 같이 맞춘다.
-- Postgres 는 on conflict 의 조건이 인덱스 조건과 맞아야 그 인덱스를 쓴다.
create or replace function close_due_auctions()
returns table (auction_id uuid, result text)
language plpgsql
set search_path = public, pg_temp
as $$
#variable_conflict use_column
begin
  return query
  with due as (
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
    on conflict (auction_id, user_id, kind)
      where auction_id is not null and kind <> 'outbid' do nothing
    returning 1
  ), notify_seller_sold as (
    insert into notifications (auction_id, user_id, kind)
    select s.id, p.seller_id, 'sold' from sold s join products p on p.id = s.product_id
    on conflict (auction_id, user_id, kind)
      where auction_id is not null and kind <> 'outbid' do nothing
    returning 1
  ), notify_seller_unsold as (
    insert into notifications (auction_id, user_id, kind)
    select u.id, p.seller_id, 'unsold' from unsold u join products p on p.id = u.product_id
    on conflict (auction_id, user_id, kind)
      where auction_id is not null and kind <> 'outbid' do nothing
    returning 1
  )
  select s.id, 'sold' from sold s
  union all
  select u.id, 'unsold' from unsold u
  union all
  select d.id, 'needs_operator'
    from due d
   where d.highest_bidder_id is null and d.has_bids;
end;
$$;

create or replace function expire_unpaid_orders()
returns table (order_id uuid, auction_id uuid)
language plpgsql
set search_path = public, pg_temp
as $$
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
    update auctions a set status = 'payment_failed'
      from failed_orders f where a.id = f.auction_id
    returning a.id, a.product_id
  ), notify_seller as (
    insert into notifications (auction_id, user_id, kind)
    select fa.id, p.seller_id, 'payment_failed'
      from failed_auctions fa join products p on p.id = fa.product_id
    on conflict (auction_id, user_id, kind)
      where auction_id is not null and kind <> 'outbid' do nothing
    returning 1
  )
  select f.id, f.auction_id from failed_orders f;
end;
$$;

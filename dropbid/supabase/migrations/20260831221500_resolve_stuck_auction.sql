-- 최고입찰자가 계정을 지운 경매를 운영자가 마무리할 수 있게 한다.
--
-- 지금까지 이런 경매는 마감 시각이 지나도 live 로 남고, 스케줄러가 매분 needs_operator 로
-- 다시 보고했다. 알림은 떴지만 **해소할 방법이 없었다.** 여기서 그 길을 만든다.
--
-- 결제할 상대가 없으므로 실질적인 결말은 유찰이다. 입찰 기록은 그대로 남는다.

create function resolve_stuck_auction(p_auction_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_auction auctions;
  v_seller_id uuid;
begin
  select * into v_auction from auctions where id = p_auction_id for update;
  if not found then
    raise exception '없는 경매다: %', p_auction_id;
  end if;

  -- 정말로 막힌 건만 손댄다. 멀쩡한 경매를 운영자 실수로 유찰시키지 않도록.
  if v_auction.status <> 'live' or v_auction.ends_at > now() then
    raise exception '마감된 뒤에도 처리되지 않은 경매가 아니다 (상태: %)', v_auction.status;
  end if;
  if v_auction.highest_bidder_id is not null then
    raise exception '최고입찰자가 있는 경매다. 스케줄러가 처리한다';
  end if;
  if not exists (select 1 from bids
                  where auction_id = p_auction_id and outcome = 'accepted') then
    raise exception '입찰이 없는 경매다. 스케줄러가 유찰 처리한다';
  end if;

  update auctions set status = 'unsold' where id = p_auction_id;

  select seller_id into v_seller_id from products where id = v_auction.product_id;
  insert into notifications (auction_id, user_id, kind)
  values (p_auction_id, v_seller_id, 'unsold')
  on conflict (auction_id, user_id, kind)
    where auction_id is not null and kind <> 'outbid' do nothing;
end;
$$;

revoke all on function resolve_stuck_auction(uuid) from public, anon, authenticated;
grant execute on function resolve_stuck_auction(uuid) to service_role;

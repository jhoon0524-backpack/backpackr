-- 알림을 "보낸 기록" 에서 "보내야 할 것" 으로 바꾼다.
--
-- 지금까지는 발송한 뒤에 한 줄 남겼다. 발송과 기록 사이에서 죽으면 기록이 없으니
-- 다음 실행이 또 보낸다. 유니크 인덱스가 있어도 막지 못한다 — 막을 행이 아직 없기 때문이다.
--
-- 그래서 낙찰·유찰이 확정되는 그 트랜잭션에서 "보내야 할 것" 을 미리 적재한다.
-- 발송기는 pending 을 집어 보내고 결과를 적는다. 중간에 죽으면 pending 으로 남아 다시 시도된다.
-- 채널은 보낼 때 정해진다. 알림톡을 먼저 쓰고 실패하면 이메일로 간다 (PRD).

drop index notifications_once_per_event_idx;

alter table notifications alter column channel drop not null;
alter table notifications drop constraint notifications_status_check;
alter table notifications drop constraint failed_needs_error;
alter table notifications drop constraint notifications_kind_check;

alter table notifications add constraint notifications_kind_check check (kind in (
  'outbid',           -- 상위 입찰이 들어왔다 (직전 최고입찰자에게)
  'won',              -- 낙찰됐다 (낙찰자에게)
  'sold',             -- 낙찰됐다 (판매자에게)
  'unsold',           -- 유찰됐다 (판매자에게)
  'payment_due',      -- 결제 기한 3시간 전이다 (낙찰자에게)
  'payment_failed',   -- 기한 내 결제가 없었다 (판매자에게)
  'product_rejected'  -- 검수에서 반려됐다 (판매자에게)
));

alter table notifications add column if not exists sent_at timestamptz;
alter table notifications alter column status set default 'pending';
alter table notifications add constraint notifications_status_check
  check (status in ('pending', 'sent', 'failed'));

-- 보냈다면 어느 채널로 보냈는지 알아야 한다. 실패했다면 이유가 있어야 한다.
alter table notifications add constraint sent_needs_channel
  check (status <> 'sent' or (channel is not null and sent_at is not null));
alter table notifications add constraint failed_needs_error
  check (status <> 'failed' or error is not null);
-- 아직 안 보낸 것에 채널이나 발송 시각이 있으면 안 된다.
alter table notifications add constraint pending_is_clean
  check (status <> 'pending' or (channel is null and sent_at is null));

-- "알림도 1회만 발송된다" (PRD 인수 조건).
-- 채널은 더 이상 열쇠에 들어가지 않는다. 이메일 폴백은 같은 줄의 채널을 바꿔 다는 것이다.
create unique index notifications_once_per_event_idx
  on notifications (auction_id, user_id, kind)
  where auction_id is not null;

revoke insert, update, delete, truncate on notifications from anon, authenticated;

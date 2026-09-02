-- 의뢰 상태를 바꾸는 유일한 통로. 애플리케이션은 이 함수들만 호출하고 requests 에 직접 쓰지 않는다.
--
-- 주의: 사용자 id 를 인자로 받는다. 브라우저가 직접 부르면 남의 이름으로 의뢰·수락할 수 있으므로
-- 서버(service_role)만 부른다. 권한은 다음 마이그레이션에서 잠근다.
--
-- 사용자 흐름에서 생길 수 있는 거부(마감·슬롯 초과 등)는 예외 대신 결과로 돌려준다.
-- 화면이 사유별 문구를 보여줘야 하기 때문이다. 남의 의뢰를 건드리는 것은 버그라 예외를 던진다.

create function submit_request(
  p_commission_id uuid, p_client_id uuid, p_brief text, p_reference_url text
) returns jsonb
language plpgsql
as $$
declare
  v_commission commissions;
  v_reason text;
  v_id uuid;
begin
  -- 행 잠금. 슬롯 계산과 삽입 사이에 다른 의뢰가 끼어들지 못하게 한다.
  select * into v_commission from commissions where id = p_commission_id for update;
  if not found then
    raise exception '없는 커미션이다: %', p_commission_id;
  end if;

  if v_commission.status <> 'open' then
    v_reason := 'closed';
  elsif v_commission.creator_id = p_client_id then
    v_reason := 'own_commission';
  elsif active_request_count(p_commission_id) >= v_commission.max_slots then
    v_reason := 'slots_full';
  elsif exists (
    select 1 from requests
     where commission_id = p_commission_id and client_id = p_client_id and status = 'requested'
  ) then
    v_reason := 'already_requested';
  end if;

  if v_reason is not null then
    return jsonb_build_object('outcome', 'rejected', 'reject_reason', v_reason);
  end if;

  insert into requests (commission_id, client_id, brief, reference_url, quoted_price)
  values (p_commission_id, p_client_id, trim(p_brief), nullif(trim(p_reference_url), ''),
          v_commission.price)
  returning id into v_id;

  return jsonb_build_object('outcome', 'accepted', 'reject_reason', null, 'request_id', v_id);
end;
$$;

-- 수락. 최종가를 확정하고 마감일(수락 시각 + 작업 기간)을 박는다.
create function accept_request(p_request_id uuid, p_creator_id uuid, p_final_price integer)
returns jsonb
language plpgsql
as $$
declare
  v_request requests;
  v_commission commissions;
  v_reason text;
begin
  select * into v_request from requests where id = p_request_id for update;
  if not found then
    raise exception '없는 의뢰다: %', p_request_id;
  end if;

  -- 커미션 행도 잠근다. 같은 커미션의 의뢰 여러 건을 동시에 수락하면 여기서 한 줄로 선다.
  -- 의뢰 행만 잠그면 서로 다른 의뢰라 안 막혀서 슬롯이 넘친다.
  select * into v_commission from commissions where id = v_request.commission_id for update;

  if v_commission.creator_id <> p_creator_id then
    raise exception '내 커미션의 의뢰가 아니다: %', p_request_id;
  end if;

  if v_request.status <> 'requested' then
    v_reason := 'not_pending';
  elsif active_request_count(v_commission.id) >= v_commission.max_slots then
    v_reason := 'slots_full';
  elsif p_final_price is null or p_final_price < 1000 then
    v_reason := 'price_too_low';
  end if;

  if v_reason is not null then
    return jsonb_build_object('outcome', 'rejected', 'reject_reason', v_reason);
  end if;

  update requests
     set status = 'accepted',
         final_price = p_final_price,
         accepted_at = now(),
         due_at = now() + make_interval(days => v_commission.turnaround_days)
   where id = p_request_id
   returning * into v_request;

  return jsonb_build_object('outcome', 'accepted', 'reject_reason', null,
                            'due_at', v_request.due_at, 'final_price', v_request.final_price);
end;
$$;

create function decline_request(p_request_id uuid, p_creator_id uuid, p_reason text)
returns jsonb
language plpgsql
as $$
declare
  v_request requests;
  v_creator_id uuid;
begin
  select * into v_request from requests where id = p_request_id for update;
  if not found then
    raise exception '없는 의뢰다: %', p_request_id;
  end if;
  select creator_id into v_creator_id from commissions where id = v_request.commission_id;
  if v_creator_id <> p_creator_id then
    raise exception '내 커미션의 의뢰가 아니다: %', p_request_id;
  end if;

  if v_request.status <> 'requested' then
    return jsonb_build_object('outcome', 'rejected', 'reject_reason', 'not_pending');
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    return jsonb_build_object('outcome', 'rejected', 'reject_reason', 'reason_required');
  end if;

  update requests set status = 'declined', decline_reason = trim(p_reason)
   where id = p_request_id;
  return jsonb_build_object('outcome', 'accepted', 'reject_reason', null);
end;
$$;

-- 의뢰인이 거둬들인다. 창작자가 이미 수락했으면 못 거둔다 — 작업이 시작됐기 때문이다.
create function cancel_request(p_request_id uuid, p_client_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_request requests;
begin
  select * into v_request from requests where id = p_request_id for update;
  if not found then
    raise exception '없는 의뢰다: %', p_request_id;
  end if;
  if v_request.client_id <> p_client_id then
    raise exception '내 의뢰가 아니다: %', p_request_id;
  end if;
  if v_request.status <> 'requested' then
    return jsonb_build_object('outcome', 'rejected', 'reject_reason', 'not_pending');
  end if;

  update requests set status = 'cancelled', cancelled_at = now() where id = p_request_id;
  return jsonb_build_object('outcome', 'accepted', 'reject_reason', null);
end;
$$;

-- 완성물 전달. 주소나 메모 중 하나는 있어야 한다.
create function deliver_request(
  p_request_id uuid, p_creator_id uuid, p_delivery_url text, p_delivery_note text
) returns jsonb
language plpgsql
as $$
declare
  v_request requests;
  v_creator_id uuid;
  v_url text := nullif(trim(p_delivery_url), '');
  v_note text := nullif(trim(p_delivery_note), '');
begin
  select * into v_request from requests where id = p_request_id for update;
  if not found then
    raise exception '없는 의뢰다: %', p_request_id;
  end if;
  select creator_id into v_creator_id from commissions where id = v_request.commission_id;
  if v_creator_id <> p_creator_id then
    raise exception '내 커미션의 의뢰가 아니다: %', p_request_id;
  end if;

  if v_request.status <> 'accepted' then
    return jsonb_build_object('outcome', 'rejected', 'reject_reason', 'not_accepted');
  end if;
  if v_url is null and v_note is null then
    return jsonb_build_object('outcome', 'rejected', 'reject_reason', 'payload_required');
  end if;

  update requests
     set status = 'delivered', delivered_at = now(), delivery_url = v_url, delivery_note = v_note
   where id = p_request_id;
  return jsonb_build_object('outcome', 'accepted', 'reject_reason', null);
end;
$$;

-- 의뢰인이 완료를 확정한다. 이 순간 슬롯이 하나 비고, 정산 의무가 생긴다 (SPEC.md 5장).
create function complete_request(p_request_id uuid, p_client_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_request requests;
begin
  select * into v_request from requests where id = p_request_id for update;
  if not found then
    raise exception '없는 의뢰다: %', p_request_id;
  end if;
  if v_request.client_id <> p_client_id then
    raise exception '내 의뢰가 아니다: %', p_request_id;
  end if;
  if v_request.status <> 'delivered' then
    return jsonb_build_object('outcome', 'rejected', 'reject_reason', 'not_delivered');
  end if;

  update requests set status = 'completed', completed_at = now() where id = p_request_id;
  return jsonb_build_object('outcome', 'accepted', 'reject_reason', null);
end;
$$;

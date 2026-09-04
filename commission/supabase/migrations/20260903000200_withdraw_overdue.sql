-- 마감일이 지나도 창작자가 아무것도 전달하지 않는 의뢰를 의뢰인이 물릴 수 있게 한다.
--
-- 왜 필요한가 —
-- 지금까지 `cancel_request` 는 `requested` 에서만 통했다. 창작자가 수락한 뒤 잠수하면
-- 의뢰인은 나갈 길이 없고, `active_request_count` 가 그 의뢰를 계속 세기 때문에
-- **창작자의 자리 하나가 영영 안 빈다.** 이 서비스가 화면에서 가장 크게 말하는 것이
-- "자리 N 남았어요" 인데, 자리가 안 비면 그 말이 거짓이 된다.
--
-- 왜 자동 취소가 아닌가 —
-- 시스템이 기한만 보고 끊으면 "이틀 늦었지만 곧 낼" 창작자까지 잘린다.
-- 사람이 누르게 둔다. 누를 수 있는 자격만 시간이 연다.
--
-- 왜 전달된 뒤에는 못 물리나 —
-- 받을 것은 이미 왔다. 그다음은 확인이거나 이의 제기지 취소가 아니다.
--
-- 결제가 붙으면 이 정책은 다시 봐야 한다. 지금은 돈이 오간 상태가 없어 위험이 낮다.

-- 마감 뒤 며칠까지 기다렸다가 물릴 수 있나. **이 수는 여기 한 곳에만 적는다** —
-- DB 함수와 화면이 서로 다른 수를 보면, 화면에 버튼이 떠 있는데 눌러도 거부당한다.
create function withdraw_grace_days() returns integer language sql immutable as $$
  select 3
$$;
grant execute on function withdraw_grace_days() to anon, authenticated, service_role;

-- 의뢰인이 거둬들인다.
--   requested            — 언제든. 아직 아무도 시작하지 않았다
--   accepted + 마감 + 유예 — 물릴 수 있다. 자리가 빈다
--   그 밖(delivered·completed·declined·cancelled) — 못 한다
--
-- `search_path` 를 여기서 다시 적는다. 권한(grant)은 replace 해도 남지만 SET 설정은 새 정의를 따르므로,
-- 안 적으면 `20260902000400` 이 걸어 둔 굳히기가 조용히 풀린다.
create or replace function cancel_request(p_request_id uuid, p_client_id uuid)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_request requests;
  v_open_at timestamptz;
begin
  select * into v_request from requests where id = p_request_id for update;
  if not found then
    raise exception '없는 의뢰다: %', p_request_id;
  end if;
  if v_request.client_id <> p_client_id then
    raise exception '내 의뢰가 아니다: %', p_request_id;
  end if;

  if v_request.status = 'requested' then
    update requests set status = 'cancelled', cancelled_at = now() where id = p_request_id;
    return jsonb_build_object('outcome', 'accepted', 'reject_reason', null);
  end if;

  if v_request.status = 'accepted' then
    -- 마감일이 없는 accepted 는 있을 수 없지만(수락이 박는다), 있다면 물리지 못하게 둔다.
    -- 시간을 모르는 채로 되돌릴 수 없는 일을 하지 않는다.
    v_open_at := v_request.due_at + make_interval(days => withdraw_grace_days());
    if v_request.due_at is null or now() < v_open_at then
      return jsonb_build_object('outcome', 'rejected', 'reject_reason', 'too_early');
    end if;
    update requests set status = 'cancelled', cancelled_at = now() where id = p_request_id;
    return jsonb_build_object('outcome', 'accepted', 'reject_reason', null);
  end if;

  return jsonb_build_object('outcome', 'rejected', 'reject_reason', 'not_pending');
end;
$$;

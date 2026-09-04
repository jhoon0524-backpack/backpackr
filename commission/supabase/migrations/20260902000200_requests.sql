-- 의뢰. 의뢰인이 넣고 창작자가 수락·거절하며, 완성물을 전달하면 의뢰인이 완료를 확정한다.
--
-- 상태 흐름 (SPEC.md 2장)
--   requested ─┬─▶ accepted ──▶ delivered ──▶ completed
--              ├─▶ declined   (창작자, 사유 필수)
--              └─▶ cancelled  (의뢰인, 수락 전까지만)
--
-- 슬롯을 차지하는 상태는 accepted 와 delivered 다. requested 는 아직 창작자가 받은 것이 아니라
-- 슬롯을 세지 않는다. 그래야 대기 중 의뢰가 많아도 창작자가 고를 수 있다.

create table requests (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references commissions (id),
  client_id uuid not null references profiles (id),

  -- 무엇을 그려/만들어 달라는지. 이것이 비어 있으면 창작자가 판단할 수 없다.
  brief text not null check (length(trim(brief)) >= 10),
  reference_url text,

  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'declined', 'cancelled', 'delivered', 'completed')),

  -- 의뢰 시점의 기본가. 수락하면서 창작자가 final_price 로 확정한다.
  quoted_price integer not null check (quoted_price >= 1000),
  final_price integer check (final_price >= 1000),

  decline_reason text,
  accepted_at timestamptz,
  due_at timestamptz,
  delivered_at timestamptz,
  delivery_url text,
  delivery_note text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),

  -- 거절하면 사유를 반드시 남긴다. 의뢰인에게 그대로 전달된다.
  constraint declined_needs_reason check (
    status <> 'declined' or decline_reason is not null
  ),
  -- 수락된 뒤의 상태는 최종가와 마감일을 갖는다.
  constraint accepted_has_terms check (
    status not in ('accepted', 'delivered', 'completed')
    or (final_price is not null and due_at is not null and accepted_at is not null)
  ),
  -- 전달했으면 결과물 주소나 메모 중 하나는 있어야 한다.
  constraint delivered_has_payload check (
    status not in ('delivered', 'completed')
    or delivered_at is not null and (delivery_url is not null or delivery_note is not null)
  )
);

-- 창작자 화면이 "내 커미션의 대기 의뢰" 를, 의뢰인 화면이 "내 의뢰" 를 본다.
create index requests_commission_status_idx on requests (commission_id, status);
create index requests_client_id_idx on requests (client_id, created_at desc);

-- 같은 커미션에 같은 사람이 대기 중 의뢰를 두 개 쌓지 못한다.
create unique index requests_one_pending_per_client
  on requests (commission_id, client_id) where status = 'requested';

-- 슬롯을 차지하는 의뢰 수. 함수와 화면이 같은 정의를 써야 해서 여기 둔다.
create function active_request_count(p_commission_id uuid) returns integer
language sql stable as $$
  select count(*)::int from requests
   where commission_id = p_commission_id and status in ('accepted', 'delivered');
$$;

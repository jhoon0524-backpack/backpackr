-- 의뢰에 직접 쓰는 길을 권한으로 막는다. 규칙을 코드 리뷰로만 지키면 언젠가 샌다. DB 가 거절하게 만든다.

-- 브라우저가 들고 있는 키로 오는 역할. 읽기만 남긴다.
revoke insert, update, delete, truncate on requests from anon, authenticated;
revoke insert, update, delete, truncate on commissions from anon, authenticated;
revoke insert, update, delete, truncate on profiles from anon, authenticated;

-- 상태 함수는 사용자 id 를 인자로 받는다. 서버(service_role)만 부른다.
revoke all on function submit_request(uuid, uuid, text, text)        from public, anon, authenticated;
revoke all on function accept_request(uuid, uuid, integer)           from public, anon, authenticated;
revoke all on function decline_request(uuid, uuid, text)             from public, anon, authenticated;
revoke all on function cancel_request(uuid, uuid)                    from public, anon, authenticated;
revoke all on function deliver_request(uuid, uuid, text, text)       from public, anon, authenticated;
revoke all on function complete_request(uuid, uuid)                  from public, anon, authenticated;
grant execute on function submit_request(uuid, uuid, text, text)     to service_role;
grant execute on function accept_request(uuid, uuid, integer)        to service_role;
grant execute on function decline_request(uuid, uuid, text)          to service_role;
grant execute on function cancel_request(uuid, uuid)                 to service_role;
grant execute on function deliver_request(uuid, uuid, text, text)    to service_role;
grant execute on function complete_request(uuid, uuid)               to service_role;

-- 남은 슬롯은 화면도 알아야 한다. 읽기 전용 계산이라 열어 둔다.
grant execute on function active_request_count(uuid) to anon, authenticated, service_role;

-- 행 수준 보안. 서버는 service_role 로 붙고 그 역할은 RLS 를 통과한다.
alter table profiles    enable row level security;
alter table commissions enable row level security;
alter table requests    enable row level security;

-- 공개 커미션은 누구나 본다. 닫힌 것은 창작자 본인만.
create policy "열린 커미션은 누구나 본다" on commissions for select to anon, authenticated
  using (status = 'open');
create policy "창작자는 자기 커미션을 본다" on commissions for select to authenticated
  using (creator_id = auth.uid());

-- 닉네임·소개는 커미션 카드에 보이는 공개 정보다. 이메일은 열이 있지만 화면에 내지 않는다.
create policy "프로필은 누구나 본다" on profiles for select to anon, authenticated using (true);

-- 의뢰는 당사자(의뢰인·창작자)만 본다. 의뢰 내용에 개인 취향과 연락 수단이 들어간다.
create policy "의뢰는 당사자만 본다" on requests for select to authenticated
  using (
    client_id = auth.uid()
    or exists (select 1 from commissions c where c.id = requests.commission_id and c.creator_id = auth.uid())
  );

-- 함수의 search_path 를 고정한다. 호출자가 스키마를 바꿔치기해 다른 함수를 부르게 하는 것을 막는다.
alter function active_request_count(uuid)                   set search_path = public, pg_temp;
alter function submit_request(uuid, uuid, text, text)       set search_path = public, pg_temp;
alter function accept_request(uuid, uuid, integer)          set search_path = public, pg_temp;
alter function decline_request(uuid, uuid, text)            set search_path = public, pg_temp;
alter function cancel_request(uuid, uuid)                   set search_path = public, pg_temp;
alter function deliver_request(uuid, uuid, text, text)      set search_path = public, pg_temp;
alter function complete_request(uuid, uuid)                 set search_path = public, pg_temp;

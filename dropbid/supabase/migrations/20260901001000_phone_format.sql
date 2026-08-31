-- 연락처를 등록할 화면이 없어서 미등록 사용자는 입찰도 등록도 못 하는 막다른 길이었다.
-- 화면을 붙이면서 DB 쪽도 같이 조인다.
--
-- place_bid 는 `phone is not null` 로만 본다. 빈 문자열은 null 이 아니라서 그대로 통과한다.
-- 형식을 못박아 빈 값·엉뚱한 값이 애초에 저장되지 못하게 한다.

update profiles set phone = null where btrim(coalesce(phone, '')) = '';

alter table profiles drop constraint if exists profiles_phone_format;
alter table profiles add constraint profiles_phone_format
  check (phone is null or phone ~ '^01[016789]-\d{3,4}-\d{4}$');

comment on column profiles.phone is
  '휴대폰 번호. 010-1234-5678 형태로만 저장한다. 미등록은 null (빈 문자열이 아니다).';

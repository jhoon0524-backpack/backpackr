-- 텀블벅 펀딩 이력. 커미션이 신뢰를 처음부터 갖고 시작하게 하는 자산이다.
--
-- **주의: 지금 값은 전부 시연용 더미다. 텀블벅 본 서비스와 연결되어 있지 않다.**
-- 실전에서는 텀블벅 쪽에서 채워 넣거나 주기적으로 조회해야 한다 (PROGRESS.md).
--
-- 무엇을 넣고 무엇을 뺐나 —
--   backer_count       의뢰인에게 보여준다. "이 사람에게 돈을 낸 사람이 N명" — 단가에 안 휘둘린다
--   satisfaction       의뢰인에게 보여준다. 단 응답이 적으면 숨긴다 (lib/format.ts 의 표시 기준)
--   follower_count     창작자 본인에게만 보여준다. 신뢰 지표로는 약하다 — 팔로우는 공짜라
--                      돈을 낸 적 없는 사람도 하고, 사기 계정도 만들 수 있다
--   모금액             넣지 않았다. 프로젝트 종류에 휘둘리고(아트북 3천만원 vs 엽서 80만원),
--                      금액이 크면 오히려 "바빠서 안 받겠네" 로 읽힌다. 창작자에겐 수입 공개라 민감하다.
--                      누구를 먼저 초대할지 고르는 데는 쓰되 화면에는 안 낸다

alter table profiles
  add column backer_count integer not null default 0 check (backer_count >= 0),
  add column satisfaction numeric(2, 1) check (satisfaction between 1.0 and 5.0),
  add column satisfaction_count integer not null default 0 check (satisfaction_count >= 0),
  add column follower_count integer not null default 0 check (follower_count >= 0);

-- 만족도 점수만 있고 응답 수가 없으면 표시 기준을 판정할 수 없다. 그 상태를 막는다.
alter table profiles add constraint satisfaction_needs_responses
  check (satisfaction is null or satisfaction_count > 0);

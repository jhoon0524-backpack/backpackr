import { MIN_SATISFACTION_RESPONSES, comma, type FundingTrust } from '@/lib/format'

/**
 * 텀블벅 펀딩 기록. 커미션 상세(의뢰인이 봄)와 내 의뢰(창작자 본인)가 같은 것을 쓴다.
 *
 * **이 상자의 일은 숫자를 보여주는 게 아니라 "이건 커미션 점수가 아니다" 라고 말하는 것이다.**
 * 전에는 노랑 띠 한 줄에 "텀블벅 후원자 1,240명 · 만족도 4.8" 이라고만 썼더니,
 * 바로 아래 노랑 3칸 표(기본 가격·작업 기간·동시 진행)와 한 묶음으로 보여서
 * "이 커미션의 만족도" 로 읽혔다 (UI/UX 5회차 발견 1). 이 서비스엔 다른 점수가 없어 견줄 것도 없다.
 * SPEC 2-1 이 "펀딩 이력은 1:1 소통 능력을 증명하지 못한다" 고 못박은 바로 그 오해다.
 *
 * 그래서 세 가지를 바꿨다 —
 *   1. 흰 바탕으로 빼서 노랑 표와 묶여 보이지 않게 한다
 *   2. 머리에 "텀블벅 펀딩 기록" 을 달고, 점수 이름도 "펀딩 만족도" 로 쓴다
 *   3. 맨 아래 한 줄로 "커미션 후기가 아니다" 라고 직접 말한다
 */
export function FundingRecord({ trust, followers }: { trust: FundingTrust; followers?: number }) {
  return (
    <div className="border-[3px] border-ink bg-white p-4">
      <p className="text-xs font-bold tracking-wide text-muted">텀블벅 펀딩 기록</p>
      {/*
        가운뎃점 대신 gap 으로 띄운다. 점을 글자에 붙여 두면 좁은 화면에서 줄이 접힐 때
        둘째 줄이 "· 만족도…" 로 시작한다 (UI/UX 5회차 발견 2).
      */}
      <p className="num mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[17px] font-bold text-ink">
        <span>후원자 {comma(trust.backers)}명</span>
        {trust.satisfaction !== null && <span>펀딩 만족도 {trust.satisfaction.toFixed(1)}</span>}
        {followers !== undefined && <span>팔로워 {comma(followers)}명</span>}
      </p>
      <p className="mt-2 text-xs font-medium leading-relaxed text-muted">
        이 커미션의 후기가 아니라, 텀블벅에서 진행한 펀딩의 기록이에요.
        {trust.hidden === 'few_responses' && ` 펀딩 만족도는 응답이 ${MIN_SATISFACTION_RESPONSES}명을 넘으면 보여드려요.`}
      </p>
    </div>
  )
}

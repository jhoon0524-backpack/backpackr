/**
 * 금액과 시각 표기.
 *
 * 시각은 한국 시간으로 못박는다. 서버와 브라우저의 시간대가 다르면 같은 값이 다른 문구로 그려져
 * 히드레이션이 깨진다. 오전/오후는 ICU 에 맡기지 않고 직접 만든다 — Node 와 크롬의 CLDR 판본이
 * 달라 한쪽은 "오전", 한쪽은 "AM" 을 낸다 (dropbid 에서 실제로 겪었다).
 */

export const won = (n: number) => n.toLocaleString('ko-KR') + '원'

/** 자릿수 구분만. 단위는 붙이지 않는다. */
export const comma = (n: number) => n.toLocaleString('ko-KR')

const KST_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

function parts(d: Date | string) {
  const out: Record<string, string> = {}
  for (const p of KST_PARTS.formatToParts(new Date(d))) out[p.type] = p.value
  return out
}

/** 예: 2026년 9월 2일 오전 7:57 */
export function kst(d: Date | string) {
  const p = parts(d)
  const h = Number(p.hour)
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${p.year}년 ${Number(p.month)}월 ${Number(p.day)}일 ${ampm} ${h12}:${p.minute}`
}

/** 날짜만. 마감일처럼 시각이 의미 없는 자리에. 예: 2026년 9월 16일 */
export function kstDate(d: Date | string) {
  const p = parts(d)
  return `${p.year}년 ${Number(p.month)}월 ${Number(p.day)}일`
}

/** 월·일만. 좁은 화면 목록에서. 예: 9월 17일 */
export function kstMonthDay(d: Date | string) {
  const p = parts(d)
  return `${Number(p.month)}월 ${Number(p.day)}일`
}

/** 마감일까지 남은 날. 지났으면 음수. 한국 시간 기준 날짜 차이다. */
export function daysLeft(due: Date | string, now: Date = new Date()) {
  const day = (d: Date | string) => {
    const p = parts(d)
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))
  }
  return Math.round((day(due) - day(now)) / 86_400_000)
}

/**
 * 텀블벅 펀딩 이력을 의뢰인에게 얼마나 보여줄지.
 *
 * 규칙 두 가지 —
 * 1. 이력이 없으면 **아무것도 그리지 않는다.** "펀딩 이력 없음" 은 갓 시작한 창작자에게 낙인이 된다.
 *    커미션은 오히려 작은 창작자에게 더 필요한 수입원이라, 없는 것을 굳이 말하지 않는다.
 * 2. 만족도는 응답이 충분할 때만 낸다. 5명이 매긴 4.9 와 300명이 매긴 4.5 는 다른 숫자다.
 */
export const MIN_SATISFACTION_RESPONSES = 30

export type FundingTrust = {
  backers: number
  satisfaction: number | null
  /**
   * 만족도를 왜 안 냈는지. 화면이 이유를 말해 주려고 갈라 둔다 —
   * 'few_responses' 는 응답이 기준보다 적어서, 'no_data' 는 만족도 자체가 없어서.
   * 이유 없이 사라지면 "낮아서 숨긴 건가" 로 읽힌다 (UI/UX 5회차 발견 3).
   */
  hidden: 'few_responses' | 'no_data' | null
}

export function trustFromFunding(p: {
  backer_count: number
  satisfaction: number | null
  satisfaction_count: number
}): FundingTrust | null {
  if (!p.backer_count) return null
  if (p.satisfaction === null) return { backers: p.backer_count, satisfaction: null, hidden: 'no_data' }
  if (p.satisfaction_count < MIN_SATISFACTION_RESPONSES) {
    return { backers: p.backer_count, satisfaction: null, hidden: 'few_responses' }
  }
  return { backers: p.backer_count, satisfaction: p.satisfaction, hidden: null }
}

/** 의뢰 상태 문구. 화면마다 다르게 쓰지 않도록 한 곳에 둔다. */
export const REQUEST_STATUS: Record<string, { text: string; tone: string }> = {
  requested: { text: '수락 대기', tone: 'bg-white text-ink' },
  accepted: { text: '작업 중', tone: 'bg-yellow text-ink' },
  delivered: { text: '전달됨 · 확인 대기', tone: 'bg-good-wash text-good' },
  completed: { text: '완료', tone: 'bg-ink text-yellow' },
  declined: { text: '거절됨', tone: 'bg-fill text-strong' },
  cancelled: { text: '취소됨', tone: 'bg-fill text-strong' },
}

/** DB 함수가 돌려주는 거부 사유를 사람 말로. */
export const REJECT_MESSAGE: Record<string, string> = {
  closed: '창작자가 이 메뉴를 내려 두었습니다. 다시 붙으면 여기서 의뢰할 수 있어요.',
  own_commission: '내가 붙인 메뉴예요. 들어온 의뢰는 내 의뢰에서 봅니다.',
  slots_full: '진행 가능한 자리가 모두 찼습니다. 자리가 비면 다시 열립니다.',
  already_requested: '이 메뉴에 보낸 의뢰가 아직 수락을 기다리고 있어요. 내 의뢰에서 확인하고, 수락되거나 거절된 뒤에 다시 보내 주세요.',
  not_pending: '이미 처리된 의뢰입니다.',
  price_too_low: '최종가는 1,000원 이상이어야 합니다.',
  reason_required: '거절 사유를 적어 주세요.',
  not_accepted: '수락된 의뢰만 전달할 수 있습니다.',
  payload_required: '결과물 주소나 전달 메모 중 하나는 있어야 합니다.',
  not_delivered: '창작자가 결과물을 전달한 뒤에 완료할 수 있습니다.',
  too_early: '아직 물릴 수 없습니다. 마감일이 지나고 며칠 더 기다린 뒤에 열립니다.',
}

export const rejectMessage = (reason: string | null | undefined) =>
  (reason && REJECT_MESSAGE[reason]) || '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'

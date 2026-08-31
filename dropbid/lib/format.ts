/**
 * 금액과 시각 표기.
 *
 * 시각은 반드시 한국 시간으로 못박는다. 서버와 브라우저의 시간대가 다르면
 * 같은 값이 다른 문구로 그려져 히드레이션이 깨진다 (실제로 겪었다).
 * 드롭은 한국 시간 기준으로 도는 서비스라 고정해도 맞다.
 *
 * 오전/오후는 ICU 에 맡기지 않고 직접 만든다. locale 을 'ko-KR' 로 줘도
 * Node 와 크롬의 CLDR 판본이 달라 한쪽은 "오전", 한쪽은 "AM" 을 낸다.
 * Node 쪽이 "AM" 이라 서버 컴포넌트에서는 영어가 그대로 굳는다 (실제로 겪었다).
 */

export const won = (n: number) => n.toLocaleString('ko-KR') + '원'

/** 자릿수 구분만. 단위는 붙이지 않는다. */
export const comma = (n: number) => n.toLocaleString('ko-KR')

// 24시간제로 부품만 받아오고 문구는 우리가 조립한다.
const KST_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
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

/** 날짜를 뺀 시:분만. 같은 날 안에서 반복해 쓸 때. 예: 오전 7:57 */
export function kstTime(d: Date | string) {
  const p = parts(d)
  const h = Number(p.hour)
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${ampm} ${h12}:${p.minute}`
}

/** 상태 등급이 무슨 뜻인지. 화면마다 다르게 쓰지 않도록 한 곳에 둔다. */
export const CONDITION: Record<string, string> = {
  A: '미개봉/새것',
  B: '사용감 적음',
  C: '사용감 있음',
}

/**
 * 닉네임 가리기. 최고입찰자·낙찰자는 아무나 볼 수 있는 자리라 그대로 두지 않는다.
 * 카카오 로그인이 붙으면 이 자리는 실명에 가까운 프로필 이름이 된다.
 * 예: 박덕후 → 박*후, 이수 → 이*, 김 → 김
 */
export function maskNickname(name: string | null | undefined) {
  if (!name) return null
  const c = [...name]
  if (c.length <= 1) return name
  if (c.length === 2) return c[0] + '*'
  return c[0] + '*'.repeat(c.length - 2) + c[c.length - 1]
}

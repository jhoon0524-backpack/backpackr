/**
 * 웹의 `dropbid/lib/format.ts` 와 **같은 규칙**이다.
 *
 * 날짜를 `Intl` 의 dayPeriod 에 맡기지 않는다. 판올림에 따라 한국어 자리에
 * "AM/PM" 이 나온다 (웹에서 실제로 겪었다). 오전·오후를 직접 만든다.
 */
export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

export const CONDITION: Record<string, string> = {
  A: '미개봉/새것',
  B: '사용감 적음',
  C: '사용감 있음',
}

const KST = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function kst(d: string | Date) {
  const p = Object.fromEntries(
    KST.formatToParts(typeof d === 'string' ? new Date(d) : d).map((x) => [x.type, x.value]),
  )
  const h = Number(p.hour)
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${p.year}년 ${Number(p.month)}월 ${Number(p.day)}일 ${ampm} ${h12}:${p.minute}`
}

/** 남은 시간. 서버 시각과의 차이를 보정해 센다 (사용자 시계를 믿지 않는다). */
export function remain(endsAt: string, skewMs: number) {
  const left = new Date(endsAt).getTime() - (Date.now() + skewMs)
  if (left <= 0) return { text: '마감', urgent: false, over: true }
  const s = Math.floor(left / 1000)
  const [h, m, sec] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
  return {
    text: [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':'),
    urgent: left < 60_000,
    over: false,
  }
}

export const maskNickname = (n: string | null) =>
  !n ? null : [...n].length <= 2 ? n : [...n].map((c, i, a) => (i === 0 || i === a.length - 1 ? c : '*')).join('')

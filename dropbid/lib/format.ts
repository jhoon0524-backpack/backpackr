/**
 * 금액과 시각 표기.
 *
 * 시각은 반드시 한국 시간으로 못박는다. 서버와 브라우저의 시간대가 다르면
 * 같은 값이 다른 문구로 그려져 히드레이션이 깨진다 (실제로 겪었다).
 * 드롭은 한국 시간 기준으로 도는 서비스라 고정해도 맞다.
 */

export const won = (n: number) => n.toLocaleString('ko-KR') + '원'

const KST = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export const kst = (d: Date | string) => KST.format(new Date(d))

/**
 * 텀블벅 토큰. 웹(`dropbid/app/globals.css`)과 **같은 값**이다.
 *
 * 두 벌로 갈라지면 곧 서로 다른 서비스처럼 보인다. 값을 바꿀 일이 생기면
 * `design/_tokens.txt` 를 고치고 웹과 앱을 함께 옮긴다.
 *
 * 대비를 재서 쓰임을 갈라 뒀다 (흰 바탕 기준) —
 *   good 6.8 / muted 5.2 → 작은 글자 가능
 *   urgent 3.75 → **큰 글자와 테두리·배경에만.** 작은 흰 글자 금지
 *   faint 2.65 → Disabled 전용. 읽는 글자에 쓰지 않는다
 */
export const C = {
  paper: '#f8f8f8',
  card: '#ffffff',
  ink: '#0d0d0d',
  strong: '#3d3d3d',
  muted: '#6d6d6d',
  faint: '#9e9e9e',
  line: '#e4e4e4',
  fill: '#f0f0f0',
  ash: '#1c1c1c',
  urgent: '#eb4b38',
  urgentWash: '#fff4f2',
  urgentLine: '#ffdad5',
  good: '#0152cc',
  goodWash: '#f2f3ff',
} as const

/** 카드 그림자. iOS 와 안드로이드가 그림자를 다르게 받아 둘 다 적는다. */
export const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
} as const

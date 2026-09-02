/**
 * 텀블벅 화면에서 따온 공통 모양. 화면마다 따로 적으면 금세 어긋나서 한 곳에 둔다.
 *
 * 버튼 — 텀블벅 "이 프로젝트 후원하기": 피치 채움, 흰 굵은 글자, 높이 52, 라운드 8.
 *        보조 버튼은 흰 바탕에 회색 테두리.
 * 입력 — 높이 48, 라운드 8, 회색 테두리, 포커스에 검정 테두리.
 */
export const BTN_PRIMARY =
  'inline-flex h-13 w-full items-center justify-center rounded-lg bg-accent px-5 text-base font-bold text-white transition hover:bg-accent-deep disabled:opacity-50'
export const BTN_SECONDARY =
  'inline-flex h-13 w-full items-center justify-center rounded-lg border border-line bg-white px-5 text-base font-semibold text-ink transition hover:bg-paper disabled:opacity-50'
/** 목록 줄 끝에 붙는 작은 버튼. 텀블벅 GNB 의 "로그인" 처럼 알약 모양이다. */
export const BTN_PILL =
  'inline-flex h-11 items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold text-ink transition hover:bg-paper disabled:opacity-50'
export const INPUT =
  'w-full rounded-lg border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none'
export const LABEL = 'mb-2 block text-sm font-semibold text-ink'
export const HELP = 'mt-2 block text-[13px] leading-relaxed text-muted'
export const ALERT = 'rounded-lg bg-urgent-wash px-4 py-3 text-sm font-medium text-urgent-text'
/** 파란 안내 띠(보냈습니다·열었습니다). 하늘색 글자는 대비가 3.0 이라 못 쓰고 navy 를 쓴다. */
export const NOTICE = 'rounded-lg bg-good-wash px-4 py-3 text-sm font-medium text-good'
/** 화면 위 "← 돌아가기". 글자는 작아도 누르는 높이는 44 를 채운다. */
export const BACK = 'inline-flex min-h-11 items-center text-sm text-muted hover:text-ink'
/** 본문 속 링크. */
export const LINK = 'inline-flex min-h-11 items-center break-all font-medium text-good underline'
/** 텀블벅 카드 위 분류 칩 — 회색 알약. */
export const CHIP = 'inline-flex items-center rounded-full bg-fill px-2.5 py-1 text-xs font-medium text-strong'

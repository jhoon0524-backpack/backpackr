/**
 * "작업실" 방향의 공통 모양. 화면마다 따로 적으면 금세 어긋나서 한 곳에 둔다.
 *
 * 버튼 — 먹색 채움(보통 일) 과 피치 채움(의뢰·수락처럼 되돌릴 수 없는 일). 라운드 2, 높이 52.
 * 입력 — 흰 바탕, 종이색 괘선, 포커스에 먹색 괘선. 라운드 2, 높이 48.
 */
export const BTN_PRIMARY =
  'inline-flex h-13 w-full items-center justify-center rounded-sm bg-accent px-5 text-base font-bold text-white transition hover:bg-accent-deep disabled:opacity-50'
export const BTN_INK =
  'inline-flex h-13 w-full items-center justify-center rounded-sm bg-ink px-5 text-base font-bold text-paper transition hover:bg-strong disabled:opacity-50'
export const BTN_SECONDARY =
  'inline-flex h-13 w-full items-center justify-center rounded-sm border border-ink bg-transparent px-5 text-base font-semibold text-ink transition hover:bg-fill disabled:opacity-50'
/** 목록 줄 끝에 붙는 작은 버튼. 높이 44. */
export const BTN_PILL =
  'inline-flex h-11 items-center rounded-full border border-ink bg-transparent px-4 text-[13px] font-semibold text-ink transition hover:bg-fill disabled:opacity-50'
export const INPUT =
  'w-full rounded-sm border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none'
export const LABEL = 'mb-2 block text-sm font-semibold text-ink'
export const HELP = 'mt-2 block text-[13px] leading-relaxed text-muted'
export const ALERT = 'rounded-sm bg-urgent-wash px-4 py-3 text-sm font-medium text-urgent-text'
/** 안내 띠(보냈습니다·열었습니다). */
export const NOTICE = 'rounded-sm bg-good-wash px-4 py-3 text-sm font-medium text-good'
/** 화면 위 "← 돌아가기". 글자는 작아도 누르는 높이는 44 를 채운다. */
export const BACK = 'inline-flex min-h-11 items-center text-sm text-muted hover:text-ink'
/** 본문 속 링크. */
export const LINK = 'inline-flex min-h-11 items-center break-all font-medium text-good underline'
/** 작은 대문자 느낌의 꼬리표 — "창작자 맞춤 작업 · 2026년 9월" 같은 줄. */
export const EYEBROW = 'text-xs font-medium tracking-[0.18em] text-muted'
/** 분류 칩. */
export const CHIP = 'inline-flex items-center rounded-full border border-line px-2.5 py-1 text-xs font-medium text-strong'
/** 절 제목 — 명조, 아래 먹색 괘선. */
export const H2 = 'serif border-b border-ink pb-3 text-xl font-bold'

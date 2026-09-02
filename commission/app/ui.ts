/**
 * "게시판" 방향의 공통 모양. 화면마다 따로 적으면 금세 어긋나서 한 곳에 둔다.
 *
 * 버튼 — 검정 3px 테두리 + 딱딱한 그림자. 피치 채움(의뢰·수락처럼 되돌릴 수 없는 일) 은 디스플레이 글자 20px,
 *        검정 채움(보통 일) 은 노랑 글자, 흰 채움(보조) 은 검정 글자. 누르면 그림자 쪽으로 살짝 밀린다.
 * 입력 — 흰 바탕, 검정 2px 테두리, 라운드 없음.
 */
const HARD = 'border-[3px] border-ink shadow-hard-sm transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50'
export const BTN_PRIMARY = `disp inline-flex h-14 w-full items-center justify-center bg-accent px-5 text-[20px] text-white ${HARD}`
export const BTN_INK = `disp inline-flex h-14 w-full items-center justify-center bg-ink px-5 text-[20px] text-yellow ${HARD}`
export const BTN_SECONDARY = `inline-flex h-14 w-full items-center justify-center bg-white px-5 text-base font-bold text-ink ${HARD}`
/** 목록 줄 끝에 붙는 작은 버튼. 높이 44. */
export const BTN_PILL = 'inline-flex h-11 shrink-0 items-center whitespace-nowrap border-2 border-ink bg-white px-3.5 text-[13px] font-bold text-ink shadow-hard-sm transition active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50'
export const INPUT = 'w-full border-2 border-ink bg-white px-4 py-3 text-[15px] text-ink placeholder:text-faint focus:bg-yellow/30 focus:outline-none'
export const LABEL = 'mb-2 block text-sm font-bold text-ink'
export const HELP = 'mt-2 block text-[13px] font-medium leading-relaxed text-muted'
export const ALERT = 'border-[3px] border-ink bg-urgent-wash px-4 py-3 text-sm font-bold text-urgent-text shadow-hard-sm'
/** 안내 띠(보냈습니다·열었습니다). 노랑 형광펜. */
export const NOTICE = 'border-[3px] border-ink bg-yellow px-4 py-3 text-sm font-bold text-ink shadow-hard-sm'
/** 화면 위 "← 돌아가기". 글자는 작아도 누르는 높이는 44 를 채운다. */
export const BACK = 'inline-flex min-h-11 items-center text-sm font-bold text-ink hover:text-accent'
/** 본문 속 링크. */
export const LINK = 'inline-flex min-h-11 items-center break-all font-bold text-good underline decoration-2'
/** 작은 꼬리표 — "일러스트 · 김창작" 같은 줄. */
export const EYEBROW = 'text-xs font-bold text-muted'
/** 분류 칩 — 노랑 네모. */
export const CHIP = 'inline-flex items-center border-2 border-ink bg-yellow px-2 py-0.5 text-xs font-bold text-ink'
/** 절 제목 — 검정 막대 위 노랑 글자. 제목 글자만큼만 칠한다. */
export const H2 = 'disp inline-block bg-ink px-2.5 py-0.5 text-[20px] text-yellow'

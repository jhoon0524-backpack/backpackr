/**
 * "게시판" 방향의 공통 모양. 화면마다 따로 적으면 금세 어긋나서 한 곳에 둔다.
 *
 * 버튼 — 검정 3px 테두리 + 딱딱한 그림자. 피치 채움(의뢰·수락처럼 되돌릴 수 없는 일) 은 디스플레이 글자 20px,
 *        검정 채움(보통 일) 은 노랑 글자, 흰 채움(보조) 은 검정 글자. 누르면 그림자 쪽으로 살짝 밀린다.
 * 입력 — 흰 바탕, 검정 2px 테두리, 라운드 없음.
 */
/*
 * **그림자는 "집어 올릴 수 있다" 는 뜻이고, 갖는 것은 둘뿐이다** — 메뉴 카드와 누르는 버튼.
 *
 * 한동안 테두리를 두른 상자마다 그림자를 달았다. 규칙을 눈에 보이게 하려던 것인데 반대가 됐다 —
 * 다 떠 있으면 뜬 것과 붙어 있는 것의 차이가 사라져서, 화면이 스티커를 붙여 놓은 판처럼 보인다.
 * 그림자는 아껴 쓰고 대신 8px 로 깊게 판다.
 *
 * **색은 둘, 역할도 둘이다.**
 *   노랑 = 누르는 것. 이 서비스의 색이다.
 *   빨강 = 자리가 걸린 것. 남은 자리, 되돌릴 수 없는 버튼, 오류.
 * 노랑을 로고에만 두면 화면의 진짜 강조색은 빨강 하나가 되고, 그러면 급한 것과 그냥 버튼이 같은 색이 된다.
 */
const HARD = 'border-[3px] border-ink shadow-hard transition active:translate-x-[8px] active:translate-y-[8px] active:shadow-none disabled:opacity-50'
export const BTN_PRIMARY = `disp inline-flex h-14 w-full items-center justify-center bg-accent px-5 text-[20px] text-white ${HARD}`
export const BTN_INK = `disp inline-flex h-14 w-full items-center justify-center bg-yellow px-5 text-[20px] text-ink ${HARD}`
export const BTN_SECONDARY = `inline-flex h-14 w-full items-center justify-center bg-white px-5 text-base font-bold text-ink ${HARD}`
/** 목록 줄 끝에 붙는 작은 버튼. 높이 44. */
export const BTN_PILL = 'inline-flex h-11 shrink-0 items-center whitespace-nowrap border-[3px] border-ink bg-white px-3.5 text-[13px] font-bold text-ink transition hover:bg-fill active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50'
/*
 * 글 쓰는 칸. 초점이 어디 있는지는 **바탕색만으로 말하지 않는다** —
 * `focus:outline-none` 을 걸어 두었더니 Tab 으로 움직일 때 입력칸만 외곽선이 사라졌고,
 * 노랑 바탕은 값이 채워지면 글자에 묻힌다 (검사표 C4). 테두리 밖으로 붉은 선을 한 겹 두른다.
 */
export const INPUT = 'w-full border-[3px] border-ink bg-white px-4 py-3 text-[15px] text-ink placeholder:text-faint focus:bg-yellow/30 focus:[outline:3px_solid_var(--color-accent)] focus:[outline-offset:2px]'
/** 틀린 칸의 테두리. 어느 칸인지 색으로도 말한다. */
export const INPUT_BAD = '!border-accent'
/** 칸 바로 아래 붙는 오류 문구. 화면 아래 ALERT 와 달리 **틀린 칸에 붙어** 있다. */
export const FIELD_ERROR = 'mt-2 block text-[13px] font-bold leading-relaxed text-urgent-text'
export const LABEL = 'mb-2 block text-sm font-bold text-ink'
export const HELP = 'mt-2 block text-[13px] font-medium leading-relaxed text-muted'
export const ALERT = 'border-[3px] border-ink bg-urgent-wash px-4 py-3 text-sm font-bold text-urgent-text'
/** 안내 띠(보냈습니다·열었습니다). 노랑 형광펜. */
export const NOTICE = 'border-[3px] border-ink bg-white px-4 py-3 text-sm font-bold text-ink'
/** 화면 위 "← 돌아가기". 글자는 작아도 누르는 높이는 44 를 채운다. */
export const BACK = 'inline-flex min-h-11 items-center text-sm font-bold text-ink hover:text-accent'
/** 본문 속 링크. */
export const LINK = 'inline-flex min-h-11 items-center break-all font-bold text-good underline decoration-2'
/** 작은 꼬리표 — "일러스트 · 김창작" 같은 줄. */
export const EYEBROW = 'text-xs font-bold text-muted'
/** 분류 칩 — 노랑 네모. */
export const CHIP = 'inline-flex items-center border-[3px] border-ink bg-white px-2 py-0.5 text-xs font-bold text-ink'
/** 절 제목 — 검정 막대 위 흰 글자. 제목 글자만큼만 칠한다. */
export const H2 = 'disp inline-block bg-ink px-2.5 py-1 text-[20px] text-white'

/**
 * 판매자 표시용 동그란 아바타.
 *
 * `profiles` 에 사진 컬럼이 없다. 스키마를 늘리는 것은 사람 승인이 필요한 일이라
 * (CLAUDE.md 4장) 이름 첫 글자로 만든다. 사진이 붙으면 이 자리를 그대로 바꾸면 된다.
 *
 * 색은 이름에서 뽑아 늘 같게 한다 — 같은 판매자가 화면마다 다른 색이면 알아보지 못한다.
 * 브랜드가 밝은 쪽 한 벌이므로 옅은 바탕에 진한 글자로 둔다 (대비 확보).
 */
const TONES = [
  'bg-orange-100 text-orange-900',
  'bg-emerald-100 text-emerald-900',
  'bg-sky-100 text-sky-900',
  'bg-violet-100 text-violet-900',
  'bg-rose-100 text-rose-900',
  'bg-amber-100 text-amber-900',
]

export function Avatar({ name, className = '' }: { name: string | null; className?: string }) {
  const label = name?.trim() ?? ''
  // 한글은 첫 글자가 곧 이름의 얼굴이다. 영문이면 첫 글자를 대문자로.
  const initial = label ? [...label][0].toUpperCase() : '?'
  let hash = 0
  for (const ch of label) hash = (hash * 31 + ch.codePointAt(0)!) % 997
  const tone = TONES[hash % TONES.length]

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tone} ${className}`}
    >
      {initial}
    </span>
  )
}

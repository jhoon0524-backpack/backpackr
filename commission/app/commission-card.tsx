import Link from 'next/link'
import type { CommissionCard as Card } from '@/lib/db'
import { won } from '@/lib/format'
import { Photo } from './photo'

/**
 * 남은 자리. 텀블벅 카드의 "123% 달성" 자리다 — 피치색 굵은 숫자 하나가 눈을 끈다.
 * 자리가 없거나 닫혔으면 회색으로 물러난다.
 */
export function SlotText({ active, max, status }: { active: number; max: number; status: string }) {
  // "마감" 이라고 하면 마감일과 헷갈린다 (UI/UX 1회차 발견 5). 닫은 것은 "닫힘", 마감은 날짜에만 쓴다.
  if (status === 'closed') return <span className="font-semibold text-muted">닫힘</span>
  const left = max - active
  if (left <= 0) return <span className="font-semibold text-muted">자리 없음</span>
  return <span className="num font-bold text-urgent-text">{left}자리 남음</span>
}

/**
 * 텀블벅 프로젝트 카드 — 4:3 썸네일(라운드 8), 그 아래 "분류 · 창작자" 작은 회색 글자,
 * 제목 두 줄, 마지막 줄에 굵은 숫자. 그림자와 테두리는 없다. 카드가 아니라 사진이 경계다.
 */
export function CommissionCard({ c }: { c: Card }) {
  return (
    <Link href={`/commissions/${c.id}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-fill">
        {c.cover_url ? (
          <Photo src={c.cover_url} alt={c.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">샘플 없음</div>
        )}
      </div>
      <p className="mt-3 truncate text-xs text-muted">{c.category} · {c.creator_nickname}</p>
      <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-ink group-hover:underline">{c.title}</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
        <SlotText active={c.active_count} max={c.max_slots} status={c.status} />
        <span className="num text-strong">{won(c.price)}~</span>
        <span className="text-muted">{c.turnaround_days}일</span>
      </p>
    </Link>
  )
}

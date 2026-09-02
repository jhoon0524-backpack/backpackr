import Link from 'next/link'
import type { CommissionCard as Card } from '@/lib/db'
import { won } from '@/lib/format'
import { Photo } from './photo'

/**
 * 남은 자리 도장. 목록·상세·마이페이지가 같은 도장을 쓴다.
 * 자리가 없거나 닫혔으면 먹색이 아니라 회색으로 물러난다.
 */
export function SlotText({ active, max, status, size = 'sm' }: { active: number; max: number; status: string; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'stamp text-[15px]' : 'stamp text-[12px]'
  if (status === 'closed') return <span className={`${cls} text-muted`}>닫힘</span>
  const left = max - active
  if (left <= 0) return <span className={`${cls} text-muted`}>자리 없음</span>
  return <span className={`${cls} num text-urgent-text`}>{left}자리 남음</span>
}

/**
 * 작품 목록 한 칸. 4:5 세로 사진, 도장은 사진 위, 그 아래 "분류 · 창작자", 명조 제목, 오른쪽에 금액.
 * `featured` 는 목록 첫 칸 — 사진이 한 줄을 다 쓰고 제목이 더 크다.
 */
export function CommissionCard({ c, featured = false }: { c: Card; featured?: boolean }) {
  return (
    <Link href={`/commissions/${c.id}`} className="group flex h-full flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-fill">
        {c.cover_url ? (
          <Photo src={c.cover_url} alt={c.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
        ) : (
          <div className="serif flex h-full items-center justify-center text-3xl font-bold text-faint">Aa</div>
        )}
        <div className="absolute left-3 top-3">
          <SlotText active={c.active_count} max={c.max_slots} status={c.status} size={featured ? 'md' : 'sm'} />
        </div>
      </div>
      <div className={`flex items-start justify-between gap-3 ${featured ? '' : 'flex-col'}`}>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-xs text-muted">{c.category} · {c.creator_nickname}</span>
          <span className={`serif line-clamp-2 font-bold leading-snug text-ink group-hover:underline ${featured ? 'text-2xl' : 'text-[17px]'}`}>{c.title}</span>
        </div>
        <div className={`num flex shrink-0 gap-x-2 ${featured ? 'flex-col items-end' : 'items-baseline'}`}>
          <span className={`font-bold text-ink ${featured ? 'text-lg' : 'text-[15px]'}`}>{won(c.price)}~</span>
          <span className="text-xs text-muted">{c.turnaround_days}일</span>
        </div>
      </div>
    </Link>
  )
}

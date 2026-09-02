import Link from 'next/link'
import type { CommissionCard as Card } from '@/lib/db'
import { won } from '@/lib/format'
import { Photo } from './photo'

/** 남은 자리 배지. 목록과 마이페이지가 같은 모양을 쓴다. */
export function SlotBadge({ active, max, status }: { active: number; max: number; status: string }) {
  if (status === 'closed') {
    return <span className="rounded bg-fill px-1.5 py-0.5 text-[11px] font-medium text-muted">마감</span>
  }
  const left = max - active
  if (left <= 0) {
    return <span className="rounded bg-fill px-1.5 py-0.5 text-[11px] font-medium text-muted">자리 없음</span>
  }
  return (
    <span className="rounded bg-good-wash px-1.5 py-0.5 text-[11px] font-medium text-good">
      {left}자리 남음
    </span>
  )
}

export function CommissionCard({ c }: { c: Card }) {
  return (
    <Link
      href={`/commissions/${c.id}`}
      className="flex h-full flex-col rounded-lg bg-card p-3 shadow-card transition hover:-translate-y-0.5"
    >
      {/* 창작자를 맨 위로. 누구에게 맡기는지가 의뢰할지 말지를 가른다. */}
      <p className="mb-2 truncate text-xs font-medium text-strong">{c.creator_nickname}</p>
      <div className="relative aspect-square overflow-hidden rounded-md bg-fill">
        {c.cover_url ? (
          <Photo src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted">샘플 없음</div>
        )}
        <div className="absolute left-2 top-2">
          <SlotBadge active={c.active_count} max={c.max_slots} status={c.status} />
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-medium text-ink">{c.title}</p>
      <p className="mt-1 text-xs text-muted">{c.category} · {c.turnaround_days}일</p>
      <p className="mt-auto pt-2 text-sm font-semibold text-ink">{won(c.price)}<span className="text-xs font-normal text-muted">부터</span></p>
    </Link>
  )
}

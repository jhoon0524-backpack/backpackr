import Link from 'next/link'
import type { CommissionCard as Card } from '@/lib/db'
import { won } from '@/lib/format'
import { Photo } from './photo'

/**
 * 남은 자리 스티커. 목록·상세·내 페이지가 같은 스티커를 쓴다.
 * 자리가 있으면 피치 바탕에 흰 글자(디스플레이 18px 이상이라 대비 3.75 로 충분), 없거나 닫혔으면 흰 바탕에 검정 글자.
 */
export function SlotText({ active, max, status, size = 'sm' }: { active: number; max: number; status: string; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'stamp text-[20px]' : 'stamp text-[18px]'
  if (status === 'closed') return <span className={`${cls} bg-white text-ink`}>내려 둠</span>
  const left = max - active
  if (left <= 0) return <span className={`${cls} bg-white text-ink`}>자리 없음</span>
  return <span className={`${cls} num bg-accent text-white`}>{left}자리 남음</span>
}

/**
 * 전단 한 장. 흰 바탕에 검정 3px 테두리와 딱딱한 그림자, 4:3 사진, 오른쪽 위에 삐져나온 스티커.
 * 아래에 "분류 · 창작자", 검은고딕 제목, 금액과 노랑 기간표.
 */
export function CommissionCard({ c }: { c: Card }) {
  return (
    <Link href={`/commissions/${c.id}`} className="group relative flex h-full flex-col border-[3px] border-ink bg-white shadow-hard transition hover:-translate-x-0.5 hover:-translate-y-0.5">
      <div className="aspect-[4/3] overflow-hidden border-b-[3px] border-ink bg-fill">
        {c.cover_url ? (
          <Photo src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
        ) : (
          <div className="disp flex h-full items-center justify-center bg-sky-wash text-6xl text-ink">가</div>
        )}
      </div>
      <div className="absolute -right-2 -top-3">
        <SlotText active={c.active_count} max={c.max_slots} status={c.status} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 pb-3.5">
        <span className="truncate text-xs font-bold text-muted">{c.category} · {c.creator_nickname}</span>
        <span className="disp line-clamp-2 text-[22px] leading-[1.15] text-ink">{c.title}</span>
        <div className="num mt-auto flex items-baseline justify-between gap-2 pt-2">
          <span className="text-[17px] font-bold text-ink">{won(c.price)}~</span>
          <span className="border-2 border-ink bg-yellow px-2 py-0.5 text-xs font-bold text-ink">{c.turnaround_days}일</span>
        </div>
      </div>
    </Link>
  )
}

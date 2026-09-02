import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCommission } from '@/lib/db'
import { won } from '@/lib/format'
import { getCurrentUser } from '@/lib/session'
import { Photo } from '@/app/photo'
import { SlotBadge } from '@/app/commission-card'
import { RequestForm } from './request-form'

export const dynamic = 'force-dynamic'

export default async function CommissionPage({ params }: PageProps<'/commissions/[id]'>) {
  const { id } = await params
  const [c, me] = await Promise.all([getCommission(id), getCurrentUser()])
  if (!c) notFound()

  const isMine = me?.id === c.creator_id
  const left = c.max_slots - c.active_count

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-xs text-muted hover:text-ink">← 커미션 목록</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{c.title}</h1>
          <SlotBadge active={c.active_count} max={c.max_slots} status={c.status} />
        </div>
        <p className="mt-1 text-sm text-muted">{c.category} · 작업 기간 {c.turnaround_days}일 · 동시 진행 {c.max_slots}건</p>
      </div>

      {c.sample_urls.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {c.sample_urls.map((u, i) => (
            <li key={i} className="aspect-square overflow-hidden rounded-md bg-fill">
              <Photo src={u} alt={`샘플 ${i + 1}`} className="h-full w-full object-cover" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-8 text-center text-xs text-muted">
          샘플 이미지가 없습니다.
        </div>
      )}

      <section className="rounded-lg bg-white p-5 shadow-card">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted">기본 가격</p>
          <p className="text-lg font-semibold">{won(c.price)}<span className="text-xs font-normal text-muted">부터</span></p>
        </div>
        <p className="mt-3 whitespace-pre-line text-sm text-strong">{c.description}</p>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-card">
        <p className="text-xs text-muted">창작자</p>
        <p className="mt-1 text-sm font-medium">{c.creator_nickname}</p>
        {c.creator_bio && <p className="mt-1 text-sm text-strong">{c.creator_bio}</p>}
      </section>

      <section className="rounded-lg bg-white p-5 shadow-card">
        <h2 className="mb-3 text-base font-semibold">의뢰하기</h2>
        {!me ? (
          <p className="text-sm text-muted">의뢰하려면 먼저 위쪽에서 사용자를 골라 주세요.</p>
        ) : isMine ? (
          <p className="text-sm text-muted">
            내 커미션입니다. 들어온 의뢰는 <Link href="/me" className="underline">마이페이지</Link> 에서 봅니다.
          </p>
        ) : c.status !== 'open' ? (
          <p className="text-sm text-muted">지금은 의뢰를 받지 않습니다.</p>
        ) : left <= 0 ? (
          <p className="text-sm text-muted">진행 가능한 자리가 모두 찼습니다. 작업이 하나 끝나면 다시 열립니다.</p>
        ) : (
          <RequestForm commissionId={c.id} />
        )}
      </section>
    </div>
  )
}

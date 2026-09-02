import Link from 'next/link'
import { listIncomingRequests, listMyCommissions, listMyRequests, type RequestRow } from '@/lib/db'
import { REQUEST_STATUS, daysLeft, kstDate, won } from '@/lib/format'
import { getCurrentUser } from '@/lib/session'
import { SlotBadge } from '@/app/commission-card'
import { toggleCommission } from './actions'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: string }) {
  const s = REQUEST_STATUS[status] ?? { text: status, tone: 'bg-fill text-muted' }
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${s.tone}`}>{s.text}</span>
}

/** 의뢰 한 줄. 의뢰인 쪽에서는 창작자를, 창작자 쪽에서는 의뢰인을 앞세운다. */
function RequestLine({ r, who }: { r: RequestRow; who: 'creator' | 'client' }) {
  const price = r.final_price ?? r.quoted_price
  const active = r.status === 'accepted' || r.status === 'delivered'
  return (
    <li>
      <Link href={`/requests/${r.id}`} className="block rounded-lg bg-white px-4 py-3 shadow-card hover:bg-paper">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium">{r.commission_title}</p>
          <StatusBadge status={r.status} />
        </div>
        <p className="mt-1 truncate text-xs text-muted">
          {who === 'creator' ? r.client_nickname : r.creator_nickname} · {won(price)}
          {r.final_price === null && <span> (기본가)</span>}
          {active && r.due_at && (
            <span> · 마감 {kstDate(r.due_at)}{daysLeft(r.due_at) < 0 ? ' (지남)' : ` (${daysLeft(r.due_at)}일 남음)`}</span>
          )}
        </p>
      </Link>
    </li>
  )
}

export default async function MyPage({ searchParams }: PageProps<'/me'>) {
  const me = await getCurrentUser()
  const sp = await searchParams
  if (!me) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white px-5 py-12 text-center">
        <p className="text-sm text-strong">먼저 위쪽에서 사용자를 골라 주세요.</p>
      </div>
    )
  }

  const [mine, incoming, myCommissions] = await Promise.all([
    listMyRequests(me.id), listIncomingRequests(me.id), listMyCommissions(me.id),
  ])
  const pendingCount = incoming.filter((r) => r.status === 'requested').length

  return (
    <div className="space-y-8">
      {sp.opened && (
        <p className="rounded bg-good-wash px-3 py-2 text-sm text-good">커미션을 열었습니다. 목록에 바로 보입니다.</p>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold">
          내 커미션에 들어온 의뢰
          {pendingCount > 0 && <span className="ml-2 rounded bg-urgent-wash px-1.5 py-0.5 text-[11px] font-medium text-urgent">답 기다림 {pendingCount}</span>}
        </h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-muted">아직 들어온 의뢰가 없습니다.</p>
        ) : (
          <ul className="space-y-2">{incoming.map((r) => <RequestLine key={r.id} r={r} who="creator" />)}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">내 커미션</h2>
        {myCommissions.length === 0 ? (
          <p className="text-sm text-muted">연 커미션이 없습니다. <Link href="/open" className="underline">커미션 열기</Link></p>
        ) : (
          <ul className="space-y-2">
            {myCommissions.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 shadow-card">
                <div className="min-w-0">
                  <Link href={`/commissions/${c.id}`} className="block truncate text-sm font-medium hover:underline">{c.title}</Link>
                  <p className="mt-1 text-xs text-muted">{won(c.price)}부터 · 진행 {c.active_count}/{c.max_slots}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SlotBadge active={c.active_count} max={c.max_slots} status={c.status} />
                  <form action={toggleCommission}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="to" value={c.status === 'open' ? 'closed' : 'open'} />
                    <button type="submit" className="rounded border border-line px-2.5 py-1 text-xs font-medium text-strong hover:bg-fill">
                      {c.status === 'open' ? '닫기' : '다시 열기'}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">내가 넣은 의뢰</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted">넣은 의뢰가 없습니다. <Link href="/" className="underline">커미션 둘러보기</Link></p>
        ) : (
          <ul className="space-y-2">{mine.map((r) => <RequestLine key={r.id} r={r} who="client" />)}</ul>
        )}
      </section>
    </div>
  )
}

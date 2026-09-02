import Link from 'next/link'
import { listIncomingRequests, listMyCommissions, listMyRequests, type RequestRow } from '@/lib/db'
import { REQUEST_STATUS, daysLeft, kstDate, won } from '@/lib/format'
import { getCurrentUser } from '@/lib/session'
import { SlotText } from '@/app/commission-card'
import { BTN_PILL, BTN_PRIMARY } from '@/app/ui'
import { toggleCommission } from './actions'

export const dynamic = 'force-dynamic'

export function StatusBadge({ status }: { status: string }) {
  const s = REQUEST_STATUS[status] ?? { text: status, tone: 'bg-fill text-muted' }
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${s.tone}`}>{s.text}</span>
}

/** 의뢰 한 줄. 텀블벅 마이페이지의 후원 내역처럼 구분선으로 나눈 목록이다. */
function RequestLine({ r, who }: { r: RequestRow; who: 'creator' | 'client' }) {
  const price = r.final_price ?? r.quoted_price
  const active = r.status === 'accepted' || r.status === 'delivered'
  return (
    <li>
      <Link href={`/requests/${r.id}`} className="flex items-center justify-between gap-4 py-4 hover:bg-paper -mx-2 px-2 rounded-lg">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{r.commission_title}</p>
          <p className="mt-1 truncate text-sm text-muted">
            {who === 'creator' ? r.client_nickname : r.creator_nickname}
            <span className="num"> · {won(price)}</span>
            {r.final_price === null && ' (기본가)'}
            {active && r.due_at && (
              <span className="num"> · 마감 {kstDate(r.due_at)}{daysLeft(r.due_at) < 0 ? ' (지남)' : ` (${daysLeft(r.due_at)}일 남음)`}</span>
            )}
          </p>
        </div>
        <StatusBadge status={r.status} />
      </Link>
    </li>
  )
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 border-b border-ink pb-3 text-lg font-bold">
        {title}
        {count !== undefined && count > 0 && (
          <span className="num rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">{count}</span>
        )}
      </h2>
      {children}
    </section>
  )
}

export default async function MyPage({ searchParams }: PageProps<'/me'>) {
  const me = await getCurrentUser()
  const sp = await searchParams
  if (!me) {
    return (
      <div className="rounded-lg border border-line px-5 py-16 text-center">
        <p className="text-[15px] font-semibold text-ink">먼저 오른쪽 위에서 사용자를 골라 주세요.</p>
      </div>
    )
  }

  const [mine, incoming, myCommissions] = await Promise.all([
    listMyRequests(me.id), listIncomingRequests(me.id), listMyCommissions(me.id),
  ])
  const pendingCount = incoming.filter((r) => r.status === 'requested').length

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{me.nickname}</h1>
        {me.bio && <p className="mt-1.5 text-[15px] text-muted">{me.bio}</p>}
      </div>

      {sp.opened && (
        <p className="rounded-lg bg-sky-wash px-4 py-3 text-sm text-sky">커미션을 열었습니다. 둘러보기 목록에 바로 보입니다.</p>
      )}

      <Section title="들어온 의뢰" count={pendingCount}>
        {incoming.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">아직 들어온 의뢰가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line">{incoming.map((r) => <RequestLine key={r.id} r={r} who="creator" />)}</ul>
        )}
      </Section>

      <Section title="내 커미션">
        {myCommissions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">연 커미션이 없습니다.</p>
            <Link href="/open" className={BTN_PRIMARY + ' mt-4 !w-auto'}>커미션 열기</Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {myCommissions.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <Link href={`/commissions/${c.id}`} className="block truncate text-[15px] font-semibold hover:underline">{c.title}</Link>
                  <p className="mt-1 text-sm text-muted">
                    <SlotText active={c.active_count} max={c.max_slots} status={c.status} />
                    <span className="num"> · {won(c.price)}~ · 진행 {c.active_count}/{c.max_slots}</span>
                  </p>
                </div>
                <form action={toggleCommission}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="to" value={c.status === 'open' ? 'closed' : 'open'} />
                  <button type="submit" className={BTN_PILL}>{c.status === 'open' ? '닫기' : '다시 열기'}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="내가 넣은 의뢰">
        {mine.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            넣은 의뢰가 없습니다. <Link href="/" className="font-semibold text-ink underline">커미션 둘러보기</Link>
          </p>
        ) : (
          <ul className="divide-y divide-line">{mine.map((r) => <RequestLine key={r.id} r={r} who="client" />)}</ul>
        )}
      </Section>
    </div>
  )
}

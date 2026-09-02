import Link from 'next/link'
import { listIncomingRequests, listMyCommissions, listMyRequests, type RequestRow } from '@/lib/db'
import { REQUEST_STATUS, daysLeft, kstMonthDay, won } from '@/lib/format'
import { getCurrentUser } from '@/lib/session'
import { SlotText } from '@/app/commission-card'
import { BTN_INK, BTN_PILL, EYEBROW, H2, NOTICE } from '@/app/ui'
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
      <Link href={`/requests/${r.id}`} className="flex items-center justify-between gap-4 py-4 -mx-2 rounded-sm px-2 hover:bg-fill">
        <div className="min-w-0">
          <p className="serif truncate text-[17px] font-bold">{r.commission_title}</p>
          <p className="mt-1 truncate text-sm text-muted">
            {who === 'creator' ? r.client_nickname : r.creator_nickname}
            <span className="num"> · {won(price)}</span>
            {r.final_price === null && ' (기본 가격)'}
          </p>
          {/* 마감은 셋째 줄에 따로. 둘째 줄에 붙이면 390 에서 말줄임표로 사라졌다 (UI/UX 1회차 발견 3). 놓치면 손해 보는 숫자다. */}
          {active && r.due_at && (
            <p className={`num mt-1 text-sm ${daysLeft(r.due_at) < 0 ? 'font-semibold text-urgent-text' : 'text-strong'}`}>
              마감 {kstMonthDay(r.due_at)}{daysLeft(r.due_at) < 0 ? ` · ${-daysLeft(r.due_at)}일 지남` : ` · ${daysLeft(r.due_at)}일 남음`}
            </p>
          )}
        </div>
        <StatusBadge status={r.status} />
      </Link>
    </li>
  )
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className={H2 + ' flex items-center gap-2'}>
        {title}
        {count !== undefined && count > 0 && (
          <span className="num rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">{count}</span>
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
      <div className="border-t border-ink py-16 text-center">
        <p className="serif text-xl font-bold text-ink">먼저 오른쪽 위에서 사용자를 골라 주세요.</p>
      </div>
    )
  }

  const [mine, incoming, myCommissions] = await Promise.all([
    listMyRequests(me.id), listIncomingRequests(me.id), listMyCommissions(me.id),
  ])
  const pendingCount = incoming.filter((r) => r.status === 'requested').length

  const myRequestsSection = (
    <Section title="내가 넣은 의뢰">
      {mine.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          넣은 의뢰가 없습니다. <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-ink underline">작업실 둘러보기</Link>
        </p>
      ) : (
        <ul className="divide-y divide-line">{mine.map((r) => <RequestLine key={r.id} r={r} who="client" />)}</ul>
      )}
    </Section>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="flex flex-col gap-2">
        <p className={EYEBROW}>내 작업실</p>
        <h1 className="serif text-[36px] font-bold leading-tight tracking-tight">{me.nickname}</h1>
        {me.bio && <p className="text-[15px] leading-relaxed text-strong">{me.bio}</p>}
      </div>

      {sp.opened && (
        <p className={NOTICE}>작업실을 열었습니다. 둘러보기 목록에 바로 보입니다.</p>
      )}

      {/*
        의뢰인에게는 빈 "들어온 의뢰" 두 칸을 지나야 자기 의뢰가 보였다 (UI/UX 1회차 발견 9).
        연 커미션이 없고 넣은 의뢰가 있으면 "내가 넣은 의뢰" 를 먼저 보여 준다.
      */}
      {myCommissions.length === 0 && mine.length > 0 && myRequestsSection}

      <Section title="들어온 의뢰" count={pendingCount}>
        {incoming.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            아직 들어온 의뢰가 없습니다.
            {myCommissions.length === 0 && <><br />작업실을 열면 의뢰가 여기로 들어옵니다.</>}
          </p>
        ) : (
          <ul className="divide-y divide-line">{incoming.map((r) => <RequestLine key={r.id} r={r} who="creator" />)}</ul>
        )}
      </Section>

      <Section title="내가 연 작업실">
        {myCommissions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">연 작업실이 없습니다.</p>
            <Link href="/open" className={BTN_INK + ' mt-4 !w-auto'}>작업실 열기</Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {myCommissions.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <Link href={`/commissions/${c.id}`} className="serif flex min-h-11 items-center truncate text-[17px] font-bold hover:underline">{c.title}</Link>
                  <p className="mt-1 text-sm text-muted">
                    <SlotText active={c.active_count} max={c.max_slots} status={c.status} />
                    <span className="num"> · {won(c.price)}~ · 동시 진행 {c.active_count}/{c.max_slots}</span>
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

      {!(myCommissions.length === 0 && mine.length > 0) && myRequestsSection}
    </div>
  )
}

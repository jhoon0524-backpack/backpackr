import Link from 'next/link'
import { listIncomingRequests, listMyCommissions, listMyRequests, type RequestRow } from '@/lib/db'
import { REQUEST_STATUS, daysLeft, kstMonthDay, trustFromFunding, won } from '@/lib/format'
import { FundingRecord } from '@/app/funding-record'
import { getCurrentUser } from '@/lib/session'
import { BTN_INK, BTN_PILL, EYEBROW, H2, NOTICE } from '@/app/ui'
import { toggleCommission } from './actions'

export const dynamic = 'force-dynamic'

export function StatusBadge({ status }: { status: string }) {
  const s = REQUEST_STATUS[status] ?? { text: status, tone: 'bg-fill text-strong' }
  return <span className={`shrink-0 border-[3px] border-ink px-2 py-1 text-xs font-bold ${s.tone}`}>{s.text}</span>
}

/** 의뢰 한 줄. 검정 테두리 상자 안에 2px 줄로 나눈 목록이다. */
function RequestLine({ r, who }: { r: RequestRow; who: 'creator' | 'client' }) {
  const price = r.final_price ?? r.quoted_price
  const active = r.status === 'accepted' || r.status === 'delivered'
  return (
    <li>
      <Link href={`/requests/${r.id}`} className="flex items-center justify-between gap-4 px-3 py-4 hover:bg-yellow/40">
        <div className="min-w-0">
          <p className="disp line-clamp-2 text-[20px] leading-tight">{r.commission_title}</p>
          <p className="mt-1 truncate text-sm font-medium text-muted">
            {who === 'creator' ? r.client_nickname : r.creator_nickname}
            <span className="num"> · {won(price)}</span>
            {r.final_price === null && ' (기본 가격)'}
          </p>
          {/* 마감은 셋째 줄에 따로. 둘째 줄에 붙이면 390 에서 말줄임표로 사라졌다 (UI/UX 1회차 발견 3). */}
          {active && r.due_at && (
            <p className={`num mt-1 text-sm font-bold ${daysLeft(r.due_at) < 0 ? 'text-urgent-text' : 'text-ink'}`}>
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
      <h2 className="flex items-center gap-3">
        <span className={H2}>{title}</span>
        {count !== undefined && count > 0 && (
          <span className="stamp num bg-accent text-[18px] text-white">{count}</span>
        )}
      </h2>
      {children}
    </section>
  )
}

const BOX = 'mt-4 divide-y-2 divide-ink border-[3px] border-ink bg-white shadow-hard'

export default async function MyPage({ searchParams }: PageProps<'/me'>) {
  const me = await getCurrentUser()
  const sp = await searchParams
  if (!me) {
    return (
      <div className="border-[3px] border-ink bg-white p-8 text-center shadow-hard">
        <p className="disp text-2xl text-ink">먼저 오른쪽 위에서 사용자를 골라 주세요.</p>
      </div>
    )
  }

  // 본인이 보는 화면이라 팔로워까지 함께 낸다. 팔로워는 신뢰 지표로는 약해서 의뢰인에게는 안 보여준다.
  // (메뉴를 붙이면 팔로워에게 알림이 가는 것은 아직 아니다 — 알림 기능이 붙어야 참이 된다. TASKS.md)
  const trust = trustFromFunding(me)

  const [mine, incoming, myCommissions] = await Promise.all([
    listMyRequests(me.id), listIncomingRequests(me.id), listMyCommissions(me.id),
  ])
  const pendingCount = incoming.filter((r) => r.status === 'requested').length

  const myRequestsSection = (
    <Section title="내가 넣은 의뢰">
      {mine.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-muted">
          넣은 의뢰가 없어요. <Link href="/" className="inline-flex min-h-11 items-center font-bold text-ink underline decoration-2">메뉴판 보기</Link>
        </p>
      ) : (
        <ul className={BOX}>{mine.map((r) => <RequestLine key={r.id} r={r} who="client" />)}</ul>
      )}
    </Section>
  )

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div className="flex flex-col gap-2">
        <p className={EYEBROW}>내 것</p>
        <h1 className="disp text-[44px] leading-none">{me.nickname}</h1>
        {me.bio && <p className="text-[15px] font-medium leading-relaxed text-strong">{me.bio}</p>}
        {trust && <div className="mt-1"><FundingRecord trust={trust} followers={me.follower_count} /></div>}
      </div>

      {sp.opened && <p className={NOTICE}>메뉴를 붙였어요. 메뉴판에 바로 보여요.</p>}

      {/*
        의뢰인에게는 빈 "들어온 의뢰" 두 칸을 지나야 자기 의뢰가 보였다 (UI/UX 1회차 발견 9).
        붙인 메뉴가 없고 넣은 의뢰가 있으면 "내가 넣은 의뢰" 를 먼저 보여 준다.
      */}
      {myCommissions.length === 0 && mine.length > 0 && myRequestsSection}

      <Section title="들어온 의뢰" count={pendingCount}>
        {incoming.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-muted">
            아직 들어온 의뢰가 없어요.
            {myCommissions.length === 0 && <><br />메뉴를 붙이면 의뢰가 여기로 들어와요.</>}
          </p>
        ) : (
          <ul className={BOX}>{incoming.map((r) => <RequestLine key={r.id} r={r} who="creator" />)}</ul>
        )}
      </Section>

      <Section title="내가 붙인 메뉴">
        {myCommissions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-muted">붙인 메뉴가 없어요.</p>
            <Link href="/open" className={BTN_INK + ' mt-4 !w-auto'}>메뉴 붙이기</Link>
          </div>
        ) : (
          <ul className={BOX}>
            {myCommissions.map((c) => {
              const left = c.max_slots - c.active_count
              return (
                <li key={c.id} className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link href={`/commissions/${c.id}`} className="disp flex min-h-11 items-center truncate text-[20px] hover:underline hover:decoration-[3px]">{c.title}</Link>
                    <p className="num mt-1 text-sm font-medium text-muted">
                      {c.status === 'closed' ? '내려 둠' : left > 0 ? `${left}자리 남음` : '자리 없음'} · {won(c.price)}~ · 동시 진행 {c.active_count}/{c.max_slots}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link href={`/commissions/${c.id}/edit`} className={BTN_PILL}>고치기</Link>
                    <form action={toggleCommission}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="to" value={c.status === 'open' ? 'closed' : 'open'} />
                      <button type="submit" className={BTN_PILL}>{c.status === 'open' ? '내리기' : '다시 붙이기'}</button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {!(myCommissions.length === 0 && mine.length > 0) && myRequestsSection}
    </div>
  )
}

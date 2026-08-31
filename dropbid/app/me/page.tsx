import Link from 'next/link'
import { listMyBids, listMySales, listMyWins } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { won, kst } from '@/lib/format'

export const dynamic = 'force-dynamic'


const PRODUCT_STATUS: Record<string, string> = {
  pending: '검수 대기',
  scheduled: '배정됨',
  rejected: '반려',
}
const AUCTION_STATUS: Record<string, string> = {
  scheduled: '시작 전',
  live: '진행 중',
  sold: '낙찰',
  unsold: '유찰',
  payment_failed: '미결제',
}
const ORDER_STATUS: Record<string, string> = {
  pending: '결제 대기',
  paid: '결제 완료',
  failed: '기한 초과',
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-5 py-8 text-center text-sm text-zinc-600">
      {children}
    </div>
  )
}

export default async function MyPage() {
  const me = await getCurrentUser()
  if (!me) {
    return (
      <Empty>
        위쪽에서 사용자를 고르면 내 입찰·낙찰·판매를 볼 수 있습니다.
        <br />
        <span className="text-xs text-zinc-500">카카오 로그인이 붙으면 이 선택은 사라집니다.</span>
      </Empty>
    )
  }

  const [bids, wins, sales] = await Promise.all([
    listMyBids(me.id),
    listMyWins(me.id),
    listMySales(me.id),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{me.nickname} 님</h1>
        {!me.phone && (
          <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
            연락처가 등록되어 있지 않아 입찰과 상품 등록이 막혀 있습니다.
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-700">내 입찰</h2>
        {bids.length === 0 ? (
          <Empty>
            아직 입찰한 경매가 없습니다. <Link href="/" className="underline">드롭 목록 보기</Link>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {bids.map((b) => (
              <li
                key={b.auction_id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <Link href={`/auctions/${b.auction_id}`} className="min-w-0 truncate hover:underline">
                  {b.title}
                </Link>
                <span className="ml-4 shrink-0 text-right text-xs">
                  <span className="tabular-nums">내 입찰 {won(b.my_amount)}</span>
                  <span className="mx-1 text-zinc-300">/</span>
                  <span className="tabular-nums text-zinc-500">현재 {won(b.current_price)}</span>
                  <span
                    className={`ml-2 rounded px-1.5 py-0.5 ${
                      b.is_winning ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {b.is_winning ? '최고가' : '밀림'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-700">낙찰</h2>
        {wins.length === 0 ? (
          <Empty>아직 낙찰받은 것이 없습니다.</Empty>
        ) : (
          <ul className="space-y-2">
            {wins.map((w) => (
              <li
                key={w.auction_id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <span className="min-w-0 truncate">{w.title}</span>
                <span className="ml-4 shrink-0 text-right text-xs">
                  <span className="tabular-nums">{won(w.amount)}</span>
                  <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5">
                    {ORDER_STATUS[w.order_status] ?? w.order_status}
                  </span>
                  {w.order_status === 'pending' && (
                    <span className="ml-2 text-zinc-500">
                      {kst(w.due_at)}까지
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-700">판매</h2>
        {sales.length === 0 ? (
          <Empty>
            아직 올린 상품이 없습니다. <Link href="/sell" className="underline">상품 등록하기</Link>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {sales.map((s) => (
              <li key={s.product_id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="min-w-0 truncate">{s.title}</span>
                  <span className="ml-4 shrink-0 text-xs">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5">
                      {PRODUCT_STATUS[s.product_status] ?? s.product_status}
                    </span>
                    {s.auction_status && (
                      <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5">
                        {AUCTION_STATUS[s.auction_status] ?? s.auction_status}
                      </span>
                    )}
                    {s.current_price !== null && (
                      <span className="ml-2 tabular-nums text-zinc-500">{won(s.current_price)}</span>
                    )}
                  </span>
                </div>
                {s.rejection_reason && (
                  <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
                    반려 사유: {s.rejection_reason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

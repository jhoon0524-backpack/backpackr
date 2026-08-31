import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAuction, listDemoUsers } from '@/lib/db'
import { Countdown } from '../../time'
import { BidForm } from './bid-form'

export const dynamic = 'force-dynamic'

const won = (n: number) => n.toLocaleString('ko-KR') + '원'

export default async function AuctionDetail(props: PageProps<'/auctions/[id]'>) {
  const { id } = await props.params
  const auction = await getAuction(id)
  if (!auction) notFound()

  const users = await listDemoUsers()

  return (
    <div>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← 드롭 목록
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight">{auction.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {auction.funding_project_name} · 상태 {auction.condition_grade} · 판매자{' '}
        {auction.seller_nickname}
      </p>

      <div className="mt-5 rounded-lg border border-zinc-200 bg-white px-5 py-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-zinc-500">현재가</p>
            <p className="text-2xl font-semibold tabular-nums">{won(auction.current_price)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">남은 시간</p>
            <p className="text-lg">
              <Countdown endsAt={auction.ends_at.toISOString()} />
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4 text-xs">
          <div>
            <dt className="text-zinc-500">입찰</dt>
            <dd className="mt-0.5 tabular-nums">{auction.bid_count}회 · {auction.bidder_count}명</dd>
          </div>
          <div>
            <dt className="text-zinc-500">최고입찰자</dt>
            <dd className="mt-0.5">{auction.highest_bidder_nickname ?? '아직 없음'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">마감 연장</dt>
            <dd className="mt-0.5 tabular-nums">{auction.extension_count}회 / 20회</dd>
          </div>
        </dl>
      </div>

      {auction.status === 'live' ? (
        <BidForm
          auctionId={auction.id}
          minNextAmount={auction.min_next_amount}
          users={users}
        />
      ) : (
        <p className="mt-5 rounded-lg border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
          마감된 경매입니다. (상태: {auction.status})
        </p>
      )}
    </div>
  )
}

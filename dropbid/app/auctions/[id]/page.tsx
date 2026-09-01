import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAuction } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { Countdown } from '../../time'
import { BidForm } from './bid-form'
import { AuctionResult } from './result'
import { LivePoller } from './live-poller'
import { Photo } from '../../photo'
import { won, CONDITION, maskNickname } from '@/lib/format'

export const dynamic = 'force-dynamic'


export default async function AuctionDetail(props: PageProps<'/auctions/[id]'>) {
  const { id } = await props.params
  const auction = await getAuction(id)
  if (!auction) notFound()

  const me = await getCurrentUser()
  const serverNow = new Date().toISOString()

  return (
    <div>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← 드롭 목록
      </Link>

      <h1 className="mt-3 text-xl font-semibold tracking-tight">{auction.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {auction.funding_project_name} · 상태 {auction.condition_grade}
        {CONDITION[auction.condition_grade] && ` · ${CONDITION[auction.condition_grade]}`} · 판매자{' '}
        {auction.seller_nickname}
      </p>

      {auction.funding_project_url && (
        <p className="mt-2 text-sm">
          {/* 원 프로젝트 확인은 판매자가 적어 준 공개 링크로만 한다. */}
          <a
            href={auction.funding_project_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
          >
            원 펀딩 프로젝트 페이지 보기 ↗
          </a>
        </p>
      )}

      {auction.photo_urls.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {auction.photo_urls.map((url, i) => (
            <Photo
              key={`${url}-${i}`}
              src={url}
              alt={`${auction.title} 사진 ${i + 1}`}
              className="h-48 w-48 shrink-0 rounded-lg border border-zinc-200 object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-5 rounded-lg border border-zinc-200 bg-white px-5 py-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-zinc-500">
              {auction.bid_count === 0 ? '시작가' : '현재가'}
            </p>
            <p className="text-2xl font-semibold tabular-nums">{won(auction.current_price)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">남은 시간</p>
            <p className="text-lg">
              <Countdown endsAt={auction.ends_at.toISOString()} serverNow={serverNow} />
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
            <dd className="mt-0.5">
              {maskNickname(auction.highest_bidder_nickname) ?? '아직 없음'}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">마감 연장</dt>
            <dd className="mt-0.5 tabular-nums">{auction.extension_count}회 / 20회</dd>
          </div>
        </dl>
      </div>

      {auction.status === 'live' ? (
        <>
          {/* Realtime 이 붙기 전까지의 폴백. 현재가가 멈춰 있으면 헛입찰이 난다. */}
          <LivePoller endsAt={auction.ends_at.toISOString()} serverNow={serverNow} />
          <BidForm
            auctionId={auction.id}
            minNextAmount={auction.min_next_amount}
            bidderNickname={me?.nickname ?? null}
          />
        </>
      ) : (
        <AuctionResult
          status={auction.status}
          currentPrice={auction.current_price}
          winnerNickname={maskNickname(auction.winner_nickname)}
          orderStatus={auction.order_status}
          orderDueAt={auction.order_due_at}
          viewerIsWinner={!!me && me.id === auction.winner_id}
          serverNow={serverNow}
        />
      )}
    </div>
  )
}

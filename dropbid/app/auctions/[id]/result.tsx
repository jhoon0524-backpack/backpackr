import Link from 'next/link'
import { kst, won } from '@/lib/format'

type Props = {
  status: string
  currentPrice: number
  winnerNickname: string | null
  orderStatus: string | null
  orderDueAt: Date | null
  viewerIsWinner: boolean
}

/** 마감된 경매는 입찰 자리를 결과로 바꾼다 (PRD 화면 상태 설계의 "마감 후"). */
export function AuctionResult({
  status,
  currentPrice,
  winnerNickname,
  orderStatus,
  orderDueAt,
  viewerIsWinner,
}: Props) {
  if (status === 'unsold') {
    return (
      <div className="mt-5 rounded-lg border border-zinc-200 bg-white px-5 py-6 text-center">
        <p className="font-medium text-zinc-700">유찰</p>
        <p className="mt-1 text-sm text-zinc-500">입찰 없이 마감되었습니다.</p>
      </div>
    )
  }

  if (status === 'payment_failed') {
    return (
      <div className="mt-5 rounded-lg border border-zinc-200 bg-white px-5 py-6 text-center">
        <p className="font-medium text-zinc-700">결제 기한 초과</p>
        <p className="mt-1 text-sm text-zinc-500">
          기한 안에 결제가 이루어지지 않아 거래가 종료되었습니다.
        </p>
      </div>
    )
  }

  if (status === 'sold') {
    return (
      <div className="mt-5 rounded-lg border border-zinc-200 bg-white px-5 py-6">
        <div className="text-center">
          <p className="font-medium text-emerald-700">낙찰</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{won(currentPrice)}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {viewerIsWinner
              ? '회원님이 낙찰받았습니다.'
              : `${winnerNickname ?? '알 수 없음'} 님에게 낙찰되었습니다.`}
          </p>
        </div>

        {viewerIsWinner && orderStatus === 'pending' && orderDueAt && (
          <div className="mt-4 rounded bg-amber-50 px-4 py-3 text-center">
            <p className="text-sm text-amber-900">
              {kst(orderDueAt)}까지 결제해야 합니다.
            </p>
            <Link
              href="/me"
              className="mt-2 inline-block rounded bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              결제하러 가기
            </Link>
          </div>
        )}
        {viewerIsWinner && orderStatus === 'paid' && (
          <p className="mt-4 rounded bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800">
            결제가 완료되었습니다. 판매자가 배송을 준비합니다.
          </p>
        )}
      </div>
    )
  }

  return (
    <p className="mt-5 rounded-lg border border-zinc-200 bg-white px-5 py-4 text-center text-sm text-zinc-600">
      아직 시작되지 않은 경매입니다.
    </p>
  )
}

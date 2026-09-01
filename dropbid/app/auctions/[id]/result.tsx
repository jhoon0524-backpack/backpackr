import Link from 'next/link'
import { kst, won } from '@/lib/format'
import { Countdown } from '../../time'

type Props = {
  status: string
  currentPrice: number
  winnerNickname: string | null
  orderStatus: string | null
  orderDueAt: Date | null
  viewerIsWinner: boolean
  serverNow: string
}

/** 마감된 경매는 입찰 자리를 결과로 바꾼다 (PRD 화면 상태 설계의 "마감 후"). */
export function AuctionResult({
  status,
  currentPrice,
  winnerNickname,
  orderStatus,
  orderDueAt,
  viewerIsWinner,
  serverNow,
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
          /*
           * 결제 기한을 낙찰 금액보다 크게 둔다.
           * 금액은 이미 알고 온 값이지만, 기한은 놓치면 거래가 날아간다.
           * 전에는 금액이 text-2xl, 기한이 text-sm 이라 잃을 것이 더 작게 보였다
           * (QA 1회차 발견 4번. 디자인 시안에도 같은 지적이 있었다).
           */
          <div className="mt-4 rounded bg-amber-50 px-4 py-4 text-center">
            <p className="text-xs text-amber-800">결제 기한</p>
            <p className="mt-1 text-2xl font-semibold text-amber-900">
              <Countdown
                endsAt={orderDueAt.toISOString()}
                serverNow={serverNow}
                format="long"
              />
            </p>
            <p className="mt-1 text-sm text-amber-900">{kst(orderDueAt)}까지</p>
            <Link
              href="/me"
              className="mt-3 inline-block rounded bg-zinc-900 px-4 py-3 text-sm text-white"
            >
              결제하러 가기
            </Link>
            {/*
              기한은 크게 보였지만 "어기면 무슨 일이 나는지" 가 없었다
              (UI/UX 1회차 발견 3번). 잃을 것을 모르면 기한도 무게가 없다.
            */}
            <p className="mt-2 text-xs text-amber-800">
              기한이 지나면 낙찰이 취소되고 상품은 다시 판매됩니다.
            </p>
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

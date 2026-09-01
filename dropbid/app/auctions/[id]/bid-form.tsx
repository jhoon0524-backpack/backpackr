'use client'

import { useActionState } from 'react'
import { submitBid, type BidState } from './actions'
import { MoneyInput } from '../../money-input'
import { comma } from '@/lib/format'

type Props = {
  auctionId: string
  minNextAmount: number
  bidderNickname: string | null
}

export function BidForm({ auctionId, minNextAmount, bidderNickname }: Props) {
  const [state, action, pending] = useActionState<BidState, FormData>(submitBid, null)

  return (
    <form action={action} className="mt-5 rounded-lg bg-white shadow-card px-5 py-4">
      <input type="hidden" name="auctionId" value={auctionId} />

      {bidderNickname ? (
        <p className="text-xs text-muted">
          <span className="font-medium text-strong">{bidderNickname}</span> 님으로 입찰합니다.
        </p>
      ) : (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          위쪽에서 사용자를 먼저 골라 주세요.
        </p>
      )}

      <label className="mt-3 block text-xs text-muted">
        입찰가 (최소 {comma(minNextAmount)}원)
        <MoneyInput
          name="amount"
          defaultValue={minNextAmount}
          className="mt-1 block w-full rounded border border-line px-3 py-2 pr-8 text-sm tabular-nums text-ink"
        />
      </label>

      <button
        type="submit"
        disabled={pending || !bidderNickname}
        className="mt-4 w-full rounded bg-ash px-4 py-3 text-sm font-medium text-white disabled:bg-faint"
      >
        {pending ? '처리 중…' : '입찰하기'}
      </button>

      {/*
        입찰은 되돌릴 수 없고, 낙찰되면 결제 의무가 생긴다. 그 사실이 누르기 전
        화면 어디에도 없었다 (UI/UX 1회차 발견 1번). 돈이 걸린 행동은 무엇을
        약속하는지 보이는 자리에서 알려 준다.
      */}
      <p className="mt-2 text-center text-xs text-muted">
        입찰은 취소할 수 없습니다. 낙찰되면 24시간 안에 결제해야 합니다.
      </p>

      {state && (
        <p
          className={`mt-3 rounded px-3 py-2 text-sm ${
            state.tone === 'success'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  )
}

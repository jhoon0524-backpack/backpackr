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
    <form action={action} className="mt-5 rounded-lg border border-zinc-200 bg-white px-5 py-4">
      <input type="hidden" name="auctionId" value={auctionId} />

      {bidderNickname ? (
        <p className="text-xs text-zinc-500">
          <span className="font-medium text-zinc-700">{bidderNickname}</span> 님으로 입찰합니다.
        </p>
      ) : (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          위쪽에서 사용자를 먼저 골라 주세요.
        </p>
      )}

      <label className="mt-3 block text-xs text-zinc-500">
        입찰가 (최소 {comma(minNextAmount)}원)
        <MoneyInput
          name="amount"
          defaultValue={minNextAmount}
          className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 pr-8 text-sm tabular-nums text-zinc-900"
        />
      </label>

      <button
        type="submit"
        disabled={pending || !bidderNickname}
        className="mt-4 w-full rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-zinc-400"
      >
        {pending ? '처리 중…' : '입찰하기'}
      </button>

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

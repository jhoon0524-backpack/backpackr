'use client'

import { useActionState } from 'react'
import { submitBid, type BidState } from './actions'

type Props = {
  auctionId: string
  minNextAmount: number
  users: { id: string; nickname: string }[]
}

export function BidForm({ auctionId, minNextAmount, users }: Props) {
  const [state, action, pending] = useActionState<BidState, FormData>(submitBid, null)

  return (
    <form action={action} className="mt-5 rounded-lg border border-zinc-200 bg-white px-5 py-4">
      <input type="hidden" name="auctionId" value={auctionId} />

      <label className="block text-xs text-zinc-500">
        누구로 입찰할까요
        {/* 로그인이 아직 없어서 사람을 골라 쓴다. 카카오 로그인이 붙으면 사라진다. */}
        <select
          name="userId"
          className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nickname}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-xs text-zinc-500">
        입찰가 (최소 {minNextAmount.toLocaleString('ko-KR')}원)
        <input
          name="amount"
          type="number"
          defaultValue={minNextAmount}
          step={100}
          className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm tabular-nums text-zinc-900"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
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

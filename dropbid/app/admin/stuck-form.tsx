'use client'

import { useActionState } from 'react'
import { resolveStuck } from './actions'
import type { ReviewState } from './actions'

export function StuckForm({ auctionId }: { auctionId: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(resolveStuck, null)

  if (state?.tone === 'success') {
    return (
      <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {state.message}
      </p>
    )
  }

  return (
    <form action={action} className="mt-3 flex items-center gap-3 border-t border-line pt-3">
      <input type="hidden" name="auctionId" value={auctionId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-line px-3 py-2 text-sm disabled:opacity-50"
      >
        {pending ? '처리 중…' : '유찰로 마무리'}
      </button>
      <span className="text-xs text-muted">결제할 상대가 없어 유찰이 유일한 결말입니다.</span>
      {state && (
        <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.message}</span>
      )}
    </form>
  )
}

'use client'

import { useActionState } from 'react'
import { relist, type RelistState } from './actions'

export function RelistForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<RelistState, FormData>(relist, null)

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded border border-line px-3 text-xs hover:bg-paper disabled:text-faint"
      >
        {pending ? '올리는 중…' : '같은 내용으로 다시 올리기'}
      </button>
      {state && (
        <p
          className={`mt-2 rounded px-3 py-2 text-xs ${
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

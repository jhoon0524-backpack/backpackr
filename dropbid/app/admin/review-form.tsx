'use client'

import { useActionState } from 'react'
import { kst } from '@/lib/format'
import { review, type ReviewState } from './actions'

type Props = {
  productId: string
  drops: { id: string; round_number: number; ends_at: string }[]
}

export function ReviewForm({ productId, drops }: Props) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(review, null)

  if (state?.tone === 'success') {
    return (
      <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {state.message}
      </p>
    )
  }

  return (
    <form action={action} className="mt-3 border-t border-line pt-3">
      <input type="hidden" name="productId" value={productId} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          배정할 회차
          <select
            name="dropId"
            className="mt-1 block rounded border border-line px-2 py-1.5 text-sm"
          >
            {drops.length === 0 && <option value="">열린 회차 없음</option>}
            {drops.map((d) => (
              <option key={d.id} value={d.id}>
                {d.round_number}회차 (마감 {kst(d.ends_at)})
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="rounded bg-ash px-3 py-2 text-sm text-white disabled:bg-faint"
        >
          승인
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="flex-1 text-xs text-muted">
          반려 사유 (판매자에게 그대로 전달됩니다)
          <input
            name="reason"
            placeholder="예: 후원 인증 이미지가 흐려 확인이 어렵습니다"
            className="mt-1 block w-full rounded border border-line px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={pending}
          className="rounded border border-line px-3 py-2 text-sm disabled:opacity-50"
        >
          반려
        </button>
      </div>

      {state && (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}
    </form>
  )
}

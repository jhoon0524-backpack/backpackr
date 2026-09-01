'use client'

import { useActionState } from 'react'
import { savePhone, type PhoneState } from './phone-actions'

export function PhoneForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState<PhoneState, FormData>(savePhone, null)

  return (
    <form action={action} className="mt-2 flex flex-wrap items-start gap-2">
      <input
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        aria-label="휴대폰 번호"
        placeholder="010-1234-5678"
        defaultValue={state?.value ?? current ?? ''}
        className="min-h-11 w-44 rounded border border-zinc-300 px-3 text-sm tabular-nums"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded bg-zinc-900 px-4 text-sm text-white disabled:bg-zinc-400"
      >
        {pending ? '저장 중…' : current ? '연락처 변경' : '연락처 등록'}
      </button>
      {state?.message && (
        <p className="w-full rounded bg-red-50 px-3 py-2 text-xs text-red-700">{state.message}</p>
      )}
    </form>
  )
}

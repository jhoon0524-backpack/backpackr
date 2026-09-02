'use client'

import { useActionState } from 'react'
import { sendRequest, type RequestState } from './actions'

const INPUT = 'w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none'

export function RequestForm({ commissionId }: { commissionId: string }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(sendRequest, null)
  const v = state?.values ?? {}

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="commissionId" value={commissionId} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-strong">의뢰 내용 <span className="text-urgent">*</span></span>
        <textarea
          name="brief" required rows={5} defaultValue={v.brief}
          placeholder="무엇을 어떤 분위기로 원하는지 적어 주세요. 캐릭터 특징, 구도, 쓰임새(프로필·인쇄 등)가 있으면 좋습니다."
          className={INPUT}
        />
        <span className="mt-1 block text-xs text-muted">10자 이상. 창작자는 이 내용만 보고 수락 여부와 최종가를 정합니다.</span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-strong">참고 링크</span>
        <input name="referenceUrl" type="url" defaultValue={v.referenceUrl} placeholder="https://" className={INPUT} />
        <span className="mt-1 block text-xs text-muted">캐릭터 시트, 레퍼런스 이미지 모음 등. 없어도 됩니다.</span>
      </label>
      {state?.message && (
        <p role="alert" className="rounded bg-urgent-wash px-3 py-2 text-sm text-urgent">{state.message}</p>
      )}
      <button
        type="submit" disabled={pending}
        className="w-full rounded bg-ash px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? '보내는 중…' : '의뢰 보내기'}
      </button>
      <p className="text-xs text-muted">보내는 것은 무료입니다. 창작자가 수락하면 최종가와 마감일이 정해집니다.</p>
    </form>
  )
}

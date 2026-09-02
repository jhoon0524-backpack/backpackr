'use client'

import { useActionState } from 'react'
import { ALERT, BTN_PRIMARY, HELP, INPUT, LABEL } from '@/app/ui'
import { sendRequest, type RequestState } from './actions'

export function RequestForm({ commissionId }: { commissionId: string }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(sendRequest, null)
  const v = state?.values ?? {}

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="commissionId" value={commissionId} />
      <label className="block">
        <span className={LABEL}>의뢰 내용</span>
        <textarea
          name="brief" required rows={5} defaultValue={v.brief}
          placeholder="무엇을 어떤 분위기로 원하는지 적어 주세요. 캐릭터 특징, 구도, 쓰임새(프로필·인쇄 등)"
          className={INPUT}
        />
        <span className={HELP}>10자 이상. 창작자는 이 내용만 보고 수락 여부와 최종가를 정합니다.</span>
      </label>
      <label className="block">
        <span className={LABEL}>참고 링크 <span className="font-normal text-muted">(선택)</span></span>
        <input name="referenceUrl" type="url" defaultValue={v.referenceUrl} placeholder="https://" className={INPUT} />
      </label>
      {state?.message && <p role="alert" className={ALERT}>{state.message}</p>}
      <button type="submit" disabled={pending} className={BTN_PRIMARY}>
        {pending ? '보내는 중…' : '이 작업실에 의뢰하기'}
      </button>
      <p className="text-center text-[13px] text-muted">보내는 것은 무료입니다. 수락 전까지 취소할 수 있습니다.</p>
    </form>
  )
}

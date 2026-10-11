'use client'

import { useActionState } from 'react'
import { ALERT, BTN_PRIMARY, FIELD_ERROR, HELP, INPUT, INPUT_BAD, LABEL } from '@/app/ui'
import { sendRequest, type RequestState } from './actions'

export function RequestForm({ commissionId }: { commissionId: string }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(sendRequest, null)
  const v = state?.values ?? {}
  // 틀린 칸 바로 아래에 문구를 붙이고 테두리도 붉게 한다 (검사표 D2). 메뉴 폼과 같은 방식이다.
  const badBrief = state?.field === 'brief'

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="commissionId" value={commissionId} />
      <label className="block">
        <span className={LABEL}>의뢰 내용</span>
        <textarea
          name="brief" required rows={5} defaultValue={v.brief}
          placeholder="무엇을 어떤 분위기로 원하는지 적어 주세요. 캐릭터 특징, 구도, 쓰임새(프로필·인쇄 등)"
          className={badBrief ? INPUT + ' ' + INPUT_BAD : INPUT}
        />
        {badBrief && <span role="alert" className={FIELD_ERROR}>{state.message}</span>}
        <span className={HELP}>10자 이상. 창작자는 이 내용만 보고 수락 여부와 최종가를 정합니다.</span>
      </label>
      <label className="block">
        <span className={LABEL}>참고 링크 <span className="font-normal text-muted">(선택)</span></span>
        <input name="referenceUrl" type="url" defaultValue={v.referenceUrl} placeholder="https://" className={INPUT} />
      </label>
      {state?.message && !state.field && <p role="alert" className={ALERT}>{state.message}</p>}
      <button type="submit" disabled={pending} className={BTN_PRIMARY}>
        {pending ? '보내는 중…' : '의뢰 보내기'}
      </button>
      <p className="text-center text-[13px] font-medium text-muted">보내는 건 무료. 수락 전까지 취소할 수 있어요.</p>
    </form>
  )
}

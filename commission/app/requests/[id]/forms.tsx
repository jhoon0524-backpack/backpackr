'use client'

import { useActionState } from 'react'
import { MoneyInput } from '@/app/money-input'
import { ALERT, BTN_PRIMARY, BTN_SECONDARY, HELP, INPUT, LABEL } from '@/app/ui'
import { actOnRequest, type ActionState } from './actions'

function Alert({ state }: { state: ActionState }) {
  if (!state?.message) return null
  return <p role="alert" className={ALERT}>{state.message}</p>
}

/** 창작자: 수락(최종가 입력) 또는 거절(사유 입력). 텀블벅 리워드 카드처럼 테두리 상자 둘이다. */
export function CreatorDecision({ id, quotedPrice }: { id: string; quotedPrice: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(actOnRequest, null)
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4 rounded-lg border border-line p-5">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value="accept" />
        <p className="text-base font-bold">수락하기</p>
        <label className="block">
          <span className={LABEL}>최종가</span>
          <MoneyInput name="finalPrice" defaultValue={quotedPrice} className={INPUT + ' pr-9'} />
          <span className={HELP}>기본가에서 조정할 수 있습니다. 수락하면 오늘부터 작업 기간만큼의 마감일이 정해지고 자리 하나를 차지합니다.</span>
        </label>
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? '처리 중…' : '이 가격으로 수락'}</button>
      </form>
      <form action={action} className="space-y-4 rounded-lg border border-line p-5">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value="decline" />
        <p className="text-base font-bold">거절하기</p>
        <textarea name="reason" rows={2} required placeholder="사유는 의뢰인에게 그대로 전달됩니다." className={INPUT} />
        <button type="submit" disabled={pending} className={BTN_SECONDARY}>{pending ? '처리 중…' : '거절'}</button>
      </form>
      <Alert state={state} />
    </div>
  )
}

/** 창작자: 완성물 전달. */
export function DeliverForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(actOnRequest, null)
  return (
    <form action={action} className="space-y-4 rounded-lg border border-line p-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value="deliver" />
      <p className="text-base font-bold">완성물 전달</p>
      <label className="block">
        <span className={LABEL}>결과물 주소</span>
        <input name="deliveryUrl" type="url" placeholder="https:// (드라이브·클라우드 공유 링크)" className={INPUT} />
      </label>
      <label className="block">
        <span className={LABEL}>전달 메모</span>
        <textarea name="deliveryNote" rows={2} placeholder="메일로 보냈다면 여기에 적어 주세요." className={INPUT} />
        <span className={HELP}>주소나 메모 중 하나는 필요합니다.</span>
      </label>
      <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? '처리 중…' : '전달 완료로 표시'}</button>
      <Alert state={state} />
    </form>
  )
}

/** 버튼 하나짜리 동작: 의뢰인의 취소, 의뢰인의 완료 확정. */
export function OneButton({ id, kind, label, help, tone = 'secondary' }: {
  id: string; kind: 'cancel' | 'complete'; label: string; help: string; tone?: 'primary' | 'secondary'
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(actOnRequest, null)
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <button type="submit" disabled={pending} className={tone === 'primary' ? BTN_PRIMARY : BTN_SECONDARY}>
        {pending ? '처리 중…' : label}
      </button>
      <p className="text-center text-[13px] text-muted">{help}</p>
      <Alert state={state} />
    </form>
  )
}

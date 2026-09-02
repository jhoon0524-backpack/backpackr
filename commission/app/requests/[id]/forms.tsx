'use client'

import { useActionState } from 'react'
import { MoneyInput } from '@/app/money-input'
import { actOnRequest, type ActionState } from './actions'

const INPUT = 'w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none'
const PRIMARY = 'rounded bg-ash px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
const SECONDARY = 'rounded border border-line px-4 py-2 text-sm font-medium text-strong hover:bg-fill disabled:opacity-50'

function Alert({ state }: { state: ActionState }) {
  if (!state?.message) return null
  return <p role="alert" className="rounded bg-urgent-wash px-3 py-2 text-sm text-urgent">{state.message}</p>
}

/** 창작자: 수락(최종가 입력) 또는 거절(사유 입력). */
export function CreatorDecision({ id, quotedPrice }: { id: string; quotedPrice: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(actOnRequest, null)
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3 rounded-lg border border-line p-4">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value="accept" />
        <p className="text-sm font-medium">수락하기</p>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">최종가 (기본가에서 조정할 수 있습니다)</span>
          <MoneyInput name="finalPrice" defaultValue={quotedPrice} className={INPUT + ' pr-8'} />
        </label>
        <p className="text-xs text-muted">수락하면 오늘부터 작업 기간만큼의 마감일이 정해지고 자리 하나를 차지합니다.</p>
        <button type="submit" disabled={pending} className={PRIMARY}>{pending ? '처리 중…' : '이 가격으로 수락'}</button>
      </form>
      <form action={action} className="space-y-3 rounded-lg border border-line p-4">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value="decline" />
        <p className="text-sm font-medium">거절하기</p>
        <textarea name="reason" rows={2} required placeholder="사유는 의뢰인에게 그대로 전달됩니다." className={INPUT} />
        <button type="submit" disabled={pending} className={SECONDARY}>{pending ? '처리 중…' : '거절'}</button>
      </form>
      <Alert state={state} />
    </div>
  )
}

/** 창작자: 완성물 전달. */
export function DeliverForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(actOnRequest, null)
  return (
    <form action={action} className="space-y-3 rounded-lg border border-line p-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value="deliver" />
      <p className="text-sm font-medium">완성물 전달</p>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">결과물 주소</span>
        <input name="deliveryUrl" type="url" placeholder="https:// (드라이브·클라우드 공유 링크)" className={INPUT} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">전달 메모</span>
        <textarea name="deliveryNote" rows={2} placeholder="메일로 보냈다면 여기에 적어 주세요. 주소나 메모 중 하나는 필요합니다." className={INPUT} />
      </label>
      <button type="submit" disabled={pending} className={PRIMARY}>{pending ? '처리 중…' : '전달 완료로 표시'}</button>
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
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <button type="submit" disabled={pending} className={tone === 'primary' ? PRIMARY : SECONDARY}>
        {pending ? '처리 중…' : label}
      </button>
      <p className="text-xs text-muted">{help}</p>
      <Alert state={state} />
    </form>
  )
}

'use client'

import { useActionState, useState } from 'react'
import { MoneyInput } from '@/app/money-input'
import { daysLeft, kstDate } from '@/lib/format'
import { ALERT, BTN_PRIMARY, BTN_SECONDARY, HELP, INPUT, LABEL } from '@/app/ui'
import { actOnRequest, type ActionState } from './actions'

function Alert({ state }: { state: ActionState }) {
  if (!state?.message) return null
  return <p role="alert" className={ALERT}>{state.message}</p>
}

/**
 * 되돌릴 수 없는 버튼은 한 번 더 묻는다 (UI/UX 1회차 발견 1·2, SPEC 5장).
 * 브라우저의 confirm() 은 버튼 글자가 브라우저 언어라 쓰지 않는다. 화면 안에서 묻는다.
 * 첫 버튼은 제출이 아니라 "묻기" 이고, 확인 상자 안의 버튼이 진짜 제출이다.
 */
function Confirm({ message, submitLabel, pending, onCancel }: {
  message: React.ReactNode; submitLabel: string; pending: boolean; onCancel: () => void
}) {
  return (
    <div role="alertdialog" className="space-y-3 border-2 border-ink bg-white p-4">
      <p className="text-sm leading-relaxed text-ink">{message}</p>
      <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? '처리 중…' : submitLabel}</button>
      <button type="button" disabled={pending} onClick={onCancel} className={BTN_SECONDARY}>아니오, 돌아가기</button>
    </div>
  )
}

/** 창작자: 수락(최종가 입력) 또는 거절(사유 입력). 텀블벅 리워드 카드처럼 테두리 상자 둘이다. */
export function CreatorDecision({ id, quotedPrice, dueAtIfNow, maxSlots, activeCount }: {
  id: string; quotedPrice: number; dueAtIfNow: string; maxSlots: number; activeCount: number
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(actOnRequest, null)
  const [arming, setArming] = useState(false)
  // 서버가 수락 시각 + 작업 기간으로 박는다. 여기서는 서버가 미리 계산해 준 값을 보여 줄 뿐이다.
  const dueAt = dueAtIfNow
  const left = maxSlots - activeCount

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4 border border-line p-5">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value="accept" />
        <p className="serif text-lg font-bold">수락하기</p>
        <label className="block">
          <span className={LABEL}>최종가</span>
          <MoneyInput name="finalPrice" defaultValue={quotedPrice} className={INPUT + ' pr-9'} />
          <span className={HELP}>기본 가격에서 조정할 수 있습니다.</span>
        </label>
        {/* 결정에 필요한 숫자를 실제 값으로. "작업 기간만큼" 이라고만 적혀 있어 며칠인지 알 수 없었다 (UI/UX 1회차 발견 1). */}
        <dl className="num grid grid-cols-2 gap-y-1 border border-line bg-white px-4 py-3 text-sm">
          <dt className="text-muted">마감일</dt>
          <dd className="font-semibold">{kstDate(dueAt)} <span className="font-normal text-muted">({daysLeft(dueAt)}일 뒤)</span></dd>
          <dt className="text-muted">남은 자리</dt>
          <dd className="font-semibold">{left} → {left - 1} <span className="font-normal text-muted">/ {maxSlots}</span></dd>
        </dl>
        {arming ? (
          <Confirm pending={pending} submitLabel="수락 확정" onCancel={() => setArming(false)}
            message={<>이 가격으로 수락하면 마감일이 <b className="num">{kstDate(dueAt)}</b>로 정해지고 자리 하나를 차지합니다. 수락한 뒤에는 되돌릴 수 없습니다.</>} />
        ) : (
          <button type="button" onClick={() => setArming(true)} className={BTN_PRIMARY}>이 가격으로 수락</button>
        )}
      </form>
      <form action={action} className="space-y-4 border border-line p-5">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="kind" value="decline" />
        <p className="serif text-lg font-bold">거절하기</p>
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
    <form action={action} className="space-y-4 border border-line p-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value="deliver" />
      <p className="serif text-lg font-bold">완성물 전달</p>
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

/** 버튼 하나짜리 동작: 의뢰인의 취소, 의뢰인의 완료 확정. `confirm` 이 있으면 한 번 더 묻는다. */
export function OneButton({ id, kind, label, help, tone = 'secondary', confirm }: {
  id: string; kind: 'cancel' | 'complete'; label: string; help: string; tone?: 'primary' | 'secondary'; confirm?: string
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(actOnRequest, null)
  const [arming, setArming] = useState(false)
  const cls = tone === 'primary' ? BTN_PRIMARY : BTN_SECONDARY
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      {confirm && arming ? (
        <Confirm pending={pending} submitLabel={label} onCancel={() => setArming(false)} message={confirm} />
      ) : confirm ? (
        <button type="button" onClick={() => setArming(true)} className={cls}>{label}</button>
      ) : (
        <button type="submit" disabled={pending} className={cls}>{pending ? '처리 중…' : label}</button>
      )}
      <p className="text-center text-[13px] text-muted">{help}</p>
      <Alert state={state} />
    </form>
  )
}

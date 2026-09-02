'use client'

import { useActionState } from 'react'
import { MoneyInput } from '@/app/money-input'
import { openCommission, type OpenState } from './actions'

const INPUT = 'w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none'

export function OpenForm({ categories }: { categories: readonly string[] }) {
  const [state, action, pending] = useActionState<OpenState, FormData>(openCommission, null)
  const v = state?.values ?? {}

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-strong">제목 <span className="text-urgent">*</span></span>
        <input name="title" required maxLength={60} defaultValue={v.title} placeholder="예: 수채 느낌 반신 일러스트" className={INPUT} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-strong">분류 <span className="text-urgent">*</span></span>
        <select name="category" required defaultValue={v.category ?? categories[0]} className={INPUT}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-strong">설명 <span className="text-urgent">*</span></span>
        <textarea
          name="description" required rows={5} defaultValue={v.description}
          placeholder="무엇을 어디까지 작업하는지, 추가 요금이 붙는 경우, 상업적 이용 가능 여부 등"
          className={INPUT}
        />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-strong">기본 가격 <span className="text-urgent">*</span></span>
          <MoneyInput name="price" defaultValue={v.price ?? 50000} className={INPUT + ' pr-8'} />
          <span className="mt-1 block text-xs text-muted">수락할 때 건별로 조정할 수 있습니다.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-strong">작업 기간(일) <span className="text-urgent">*</span></span>
          <input name="turnaroundDays" inputMode="numeric" required defaultValue={v.turnaroundDays ?? '14'} className={INPUT} />
          <span className="mt-1 block text-xs text-muted">수락한 날부터 셉니다.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-strong">동시 진행 건수 <span className="text-urgent">*</span></span>
          <input name="maxSlots" inputMode="numeric" required defaultValue={v.maxSlots ?? '3'} className={INPUT} />
          <span className="mt-1 block text-xs text-muted">이 수만큼 수락하면 자리가 찹니다.</span>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-strong">샘플 이미지 주소</span>
        <textarea name="sampleUrls" rows={3} defaultValue={v.sampleUrls} placeholder="한 줄에 하나씩" className={INPUT} />
        <span className="mt-1 block text-xs text-muted">아직 업로드가 없어 주소를 적습니다. 없어도 열 수 있습니다.</span>
      </label>
      {state?.message && (
        <p role="alert" className="rounded bg-urgent-wash px-3 py-2 text-sm text-urgent">{state.message}</p>
      )}
      <button type="submit" disabled={pending} className="w-full rounded bg-ash px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? '여는 중…' : '커미션 열기'}
      </button>
    </form>
  )
}

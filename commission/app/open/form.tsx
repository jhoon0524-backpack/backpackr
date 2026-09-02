'use client'

import { useActionState } from 'react'
import { MoneyInput } from '@/app/money-input'
import { ALERT, BTN_INK, H2, HELP, INPUT, LABEL } from '@/app/ui'
import { openCommission, type OpenState } from './actions'

export function OpenForm({ categories }: { categories: readonly string[] }) {
  const [state, action, pending] = useActionState<OpenState, FormData>(openCommission, null)
  const v = state?.values ?? {}

  return (
    <form action={action} className="space-y-8">
      {/* 텀블벅 프로젝트 만들기처럼 묶음마다 제목을 두고 사이를 구분선으로 나눈다. */}
      <section className="space-y-5">
        <h2 className={H2}>기본 정보</h2>
        <label className="block">
          <span className={LABEL}>제목</span>
          <input name="title" required maxLength={60} defaultValue={v.title} placeholder="예: 수채 느낌 반신 일러스트" className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>분류</span>
          <select name="category" required defaultValue={v.category ?? categories[0]} className={INPUT}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={LABEL}>작업 안내</span>
          <textarea
            name="description" required rows={6} defaultValue={v.description}
            placeholder="무엇을 어디까지 작업하는지, 추가 요금이 붙는 경우, 상업적 이용 가능 여부 등"
            className={INPUT}
          />
        </label>
      </section>

      <section className="space-y-5 pt-4">
        <h2 className={H2}>가격과 일정</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <label className="block">
            <span className={LABEL}>기본 가격</span>
            <MoneyInput name="price" defaultValue={v.price ?? 50000} className={INPUT + ' pr-9'} />
            <span className={HELP}>수락할 때 건별로 조정할 수 있습니다.</span>
          </label>
          <label className="block">
            <span className={LABEL}>작업 기간(일)</span>
            <input name="turnaroundDays" inputMode="numeric" required defaultValue={v.turnaroundDays ?? '14'} className={INPUT} />
            <span className={HELP}>수락한 날부터 셉니다.</span>
          </label>
          <label className="block">
            <span className={LABEL}>동시 진행 건수</span>
            <input name="maxSlots" inputMode="numeric" required defaultValue={v.maxSlots ?? '3'} className={INPUT} />
            <span className={HELP}>이 수만큼 수락하면 자리가 찹니다.</span>
          </label>
        </div>
      </section>

      <section className="space-y-5 pt-4">
        <h2 className={H2}>샘플</h2>
        <label className="block">
          <span className={LABEL}>샘플 이미지 주소 <span className="font-normal text-muted">(선택)</span></span>
          <textarea name="sampleUrls" rows={3} defaultValue={v.sampleUrls} placeholder="한 줄에 하나씩" className={INPUT} />
          <span className={HELP}>첫 줄이 대표 이미지가 돼요. 아직 업로드가 없어 주소를 적어요.</span>
        </label>
      </section>

      {state?.message && <p role="alert" className={ALERT}>{state.message}</p>}
      <button type="submit" disabled={pending} className={BTN_INK}>
        {pending ? '붙이는 중…' : '메뉴 붙이기'}
      </button>
    </form>
  )
}

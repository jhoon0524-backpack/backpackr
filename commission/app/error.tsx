'use client'

import { BTN_SECONDARY } from './ui'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-line px-5 py-16 text-center">
      <p className="text-[15px] font-semibold text-ink">화면을 불러오지 못했습니다.</p>
      <p className="mt-1.5 text-sm text-muted">잠시 뒤 다시 시도해 주세요.</p>
      <button onClick={reset} className={BTN_SECONDARY + ' mt-6 !w-auto'}>다시 시도</button>
    </div>
  )
}

'use client'

import { BTN_SECONDARY } from './ui'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="border-[3px] border-ink bg-white p-8 text-center">
      <p className="disp text-2xl text-ink">화면을 불러오지 못했습니다.</p>
      <p className="mt-1.5 text-sm text-muted">잠시 뒤 다시 시도해 주세요.</p>
      <button onClick={reset} className={BTN_SECONDARY + ' mt-6 !w-auto'}>다시 시도</button>
    </div>
  )
}

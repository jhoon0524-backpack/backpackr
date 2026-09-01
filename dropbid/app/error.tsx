'use client'

/** 목록을 못 불러온 경우 (PRD 화면 상태 설계의 "실패"). */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg bg-white shadow-card px-5 py-12 text-center">
      <p className="text-sm text-strong">경매 목록을 불러오지 못했습니다.</p>
      <p className="mt-1 text-xs text-muted">잠시 뒤 다시 시도해 주세요.</p>
      <button
        onClick={reset}
        className="mt-4 rounded bg-ash px-4 py-2 text-sm text-white"
      >
        다시 시도
      </button>
    </div>
  )
}

/** 드롭 목록이 뜨기 전 자리를 잡아 준다 (PRD 화면 상태 설계의 "로딩"). */
export default function Loading() {
  return (
    <div>
      <div className="mb-5">
        <div className="h-6 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-zinc-100" />
      </div>
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="rounded-lg border border-zinc-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="w-full space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
              </div>
              <div className="w-24 shrink-0 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-zinc-200" />
                <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

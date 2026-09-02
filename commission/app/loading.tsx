/** 목록이 뜨기 전 자리를 잡아 준다. 카드 모양(4:5 사진 + 글 두 줄)을 그대로 흉내낸다. */
export default function Loading() {
  return (
    <div>
      <div className="flex flex-col gap-3 pb-7">
        <div className="h-3 w-40 animate-pulse rounded bg-fill" />
        <div className="h-10 w-64 animate-pulse rounded bg-fill" />
        <div className="h-4 w-80 animate-pulse rounded bg-fill" />
      </div>
      <ul className="grid grid-cols-2 gap-x-5 gap-y-9 border-t border-ink py-6 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <div className="aspect-[4/5] animate-pulse rounded-sm bg-fill" />
            <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-fill" />
            <div className="mt-2 h-5 w-5/6 animate-pulse rounded bg-fill" />
          </li>
        ))}
      </ul>
    </div>
  )
}

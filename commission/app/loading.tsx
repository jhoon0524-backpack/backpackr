/** 커미션 목록이 뜨기 전 자리를 잡아 준다. 카드 모양(4:3 사진 + 글 세 줄)을 그대로 흉내낸다. */
export default function Loading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-7 w-40 animate-pulse rounded bg-fill" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-fill" />
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <div className="aspect-[4/3] animate-pulse rounded-lg bg-fill" />
            <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-fill" />
            <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-fill" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-fill" />
          </li>
        ))}
      </ul>
    </div>
  )
}

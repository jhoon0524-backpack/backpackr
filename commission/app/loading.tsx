/** 메뉴판이 뜨기 전 자리를 잡아 준다. 전단 모양(테두리 + 4:3 사진 + 글 두 줄)을 흉내낸다. */
export default function Loading() {
  return (
    <div>
      <div className="flex flex-col gap-2 pb-6">
        <div className="h-12 w-56 animate-pulse bg-fill" />
        <div className="h-4 w-80 animate-pulse bg-fill" />
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-8 pt-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="border-[3px] border-ink bg-white shadow-hard">
            <div className="aspect-[4/3] animate-pulse border-b-[3px] border-ink bg-fill" />
            <div className="p-3">
              <div className="h-3 w-1/2 animate-pulse bg-fill" />
              <div className="mt-2 h-6 w-5/6 animate-pulse bg-fill" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

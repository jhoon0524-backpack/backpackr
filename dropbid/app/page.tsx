import Link from 'next/link'
import { listLiveAuctions } from '@/lib/db'
import { Countdown } from './time'
import { won } from '@/lib/format'

export const dynamic = 'force-dynamic'


export default async function DropList() {
  const auctions = await listLiveAuctions()
  // 브라우저 시계 보정용. 서버가 그린 시각을 함께 내려보낸다.
  const serverNow = new Date().toISOString()

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">이번 드롭</h1>
        <p className="mt-1 text-sm text-zinc-500">
          마감 임박순입니다. 회차에 속한 경매는 같은 시각에 함께 마감합니다.
        </p>
      </div>

      {auctions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-5 py-12 text-center">
          <p className="text-sm text-zinc-600">지금 진행 중인 경매가 없습니다.</p>
          <p className="mt-1 text-xs text-zinc-500">다음 드롭이 열리면 알려드릴게요.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {auctions.map((a) => (
            <li key={a.id}>
              <Link
                href={`/auctions/${a.id}`}
                className="block rounded-lg border border-zinc-200 bg-white px-5 py-4 transition hover:border-zinc-400"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {a.funding_project_name} · 상태 {a.condition_grade}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums">{won(a.current_price)}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      입찰 {a.bid_count}회 · <Countdown endsAt={a.ends_at.toISOString()} serverNow={serverNow} />
                    </p>
                  </div>
                </div>
                {a.bidder_count >= 2 && (
                  <p className="mt-2 inline-block rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                    경쟁 입찰 중 · {a.bidder_count}명
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

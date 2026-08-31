import Link from 'next/link'
import { listLastDropResults, listLiveAuctions } from '@/lib/db'
import { Countdown } from './time'
import { Photo } from './photo'
import { won, kst, maskNickname } from '@/lib/format'

export const dynamic = 'force-dynamic'


const RESULT_LABEL: Record<string, { text: string; tone: string }> = {
  sold: { text: '낙찰', tone: 'bg-emerald-50 text-emerald-700' },
  unsold: { text: '유찰', tone: 'bg-zinc-100 text-zinc-500' },
  payment_failed: { text: '미결제 종료', tone: 'bg-zinc-100 text-zinc-500' },
}

export default async function DropList() {
  const [auctions, past] = await Promise.all([listLiveAuctions(), listLastDropResults()])
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
          <p className="mt-1 text-xs text-zinc-500">
            다음 드롭이 열리면 알려드릴게요.
            {past.length > 0 && ' 방금 끝난 회차 결과는 아래에서 볼 수 있습니다.'}
          </p>
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
                  <div className="flex min-w-0 gap-3">
                    {a.cover_url && (
                      <Photo
                        src={a.cover_url}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {a.funding_project_name} · 상태 {a.condition_grade}
                    </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-zinc-500">
                      {a.bid_count === 0 ? '시작가' : '현재가'}
                    </p>
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

      {/* 드롭이 끝나면 홈이 통째로 비어 방금 끝난 경매를 볼 곳이 없었다. */}
      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold tracking-tight">
            지난 드롭 결과 · {past[0].round_number}회차
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{kst(past[0].ends_at)} 마감</p>
          <ul className="mt-3 space-y-2">
            {past.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/auctions/${r.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-400"
                >
                  <span className="min-w-0 truncate text-sm">{r.title}</span>
                  <span className="ml-4 shrink-0 text-right text-xs">
                    <span className="tabular-nums text-zinc-700">{won(r.final_price)}</span>
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 ${RESULT_LABEL[r.status]?.tone ?? ''}`}
                    >
                      {RESULT_LABEL[r.status]?.text ?? r.status}
                    </span>
                    {r.status === 'sold' && r.winner_nickname && (
                      <span className="ml-2 text-zinc-500">
                        {maskNickname(r.winner_nickname)} 님
                      </span>
                    )}
                    {r.status === 'unsold' && (
                      <span className="ml-2 text-zinc-400">입찰 없음</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

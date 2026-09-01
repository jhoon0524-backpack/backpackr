import Link from 'next/link'
import { listLastDropResults, listLiveAuctions } from '@/lib/db'
import { Countdown } from './time'
import { Photo } from './photo'
import { Avatar } from './avatar'
import { won, kst, maskNickname, CONDITION } from '@/lib/format'

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
        {/*
          한 회차는 같이 마감하므로 카드마다 같은 숫자가 반복됐다. 게다가 카드의
          "입찰 2회 · 01:59:29" 에는 무엇의 시간인지 라벨이 없었다
          (UI/UX 1회차 발견 8번). 시안대로 회차 마감을 위에 한 번만 둔다.
        */}
        {auctions.length > 0 && (
          <p className="mt-3 inline-flex items-baseline gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
            <span className="text-zinc-500">이번 회차 마감까지</span>
            <span className="font-semibold">
              <Countdown endsAt={auctions[0].ends_at.toISOString()} serverNow={serverNow} />
            </span>
          </p>
        )}
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
        /*
          Whatnot 목록을 참고해 짜맞췄다 (사장님이 화면을 주셨다).
          가져온 것 — 판매자를 카드 위로, 사진을 먼저 크게, 경쟁 배지를 사진 위에 얹기,
                     좁은 화면 2열.
          안 가져온 것 — 어두운 테마와 색. 우리는 밝은 쪽 한 벌이고 브랜드는 텀블벅이다.
                       카테고리 칩도 뺐다. 한 회차에 상품이 몇 개뿐이라 걸러 봐야
                       빈 화면만 나온다. 참고를 그대로 베끼면 제품이 나빠지는 자리다.

          굿즈는 눈으로 고르는 물건인데 56px 썸네일로는 판단이 안 됐다. 사진을 앞세운다.
        */
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {auctions.map((a) => (
            <li key={a.id}>
              <Link
                href={`/auctions/${a.id}`}
                className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-3 transition hover:border-zinc-400"
              >
                {/* 판매자를 맨 위로. 누가 파는지가 살지 말지를 가른다. */}
                <div className="mb-2 flex min-w-0 items-center gap-1.5">
                  <Avatar name={a.seller_nickname} className="h-5 w-5 text-[10px]" />
                  <span className="truncate text-xs font-medium text-zinc-700">
                    {a.seller_nickname ?? '알 수 없음'}
                  </span>
                </div>

                <div className="relative overflow-hidden rounded bg-zinc-100">
                  <Photo
                    src={a.cover_url ?? ''}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                  {a.bidder_count >= 2 && (
                    <span className="absolute bottom-1 left-1 rounded bg-emerald-700 px-1.5 py-0.5 text-[11px] font-medium text-white">
                      경쟁 {a.bidder_count}명
                    </span>
                  )}
                </div>

                <p className="mt-2 line-clamp-2 text-sm font-medium">{a.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                  {/* 목록에는 등급만 있고 뜻풀이가 상세에만 있었다 (UI/UX 발견 10번). */}
                  {CONDITION[a.condition_grade] ?? `상태 ${a.condition_grade}`}
                </p>

                {/* 금액은 카드 맨 아래에 붙여 카드마다 같은 높이에 오게 한다. */}
                <div className="mt-auto pt-2">
                  <p className="text-[11px] text-zinc-500">
                    {a.bid_count === 0 ? '시작가' : '현재가'}
                  </p>
                  <p className="font-semibold tabular-nums">{won(a.current_price)}</p>
                  <p className="text-[11px] text-zinc-500">입찰 {a.bid_count}회</p>
                </div>
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
                      <span className="ml-2 text-zinc-500">입찰 없음</span>
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

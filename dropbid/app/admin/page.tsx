import { listOpenDrops, listPendingProducts, listStuckAuctions } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { ReviewForm } from './review-form'
import { StuckForm } from './stuck-form'
import { Photo } from '../photo'
import { won, kst } from '@/lib/format'

export const dynamic = 'force-dynamic'


export default async function AdminReview() {
  // 검수 대기 목록에는 판매자 이름·연락 단서가 붙는다. 운영자가 아니면 조회 자체를 하지 않는다.
  const me = await getCurrentUser()
  if (!me?.is_operator) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-5 py-12 text-center">
        <p className="text-sm text-zinc-700">운영자만 볼 수 있는 화면입니다.</p>
        <p className="mt-1 text-xs text-zinc-500">
          검수 권한이 필요하면 운영자에게 요청해 주세요.
        </p>
      </div>
    )
  }

  const [products, drops, stuck] = await Promise.all([
    listPendingProducts(),
    listOpenDrops(),
    listStuckAuctions(),
  ])
  const dropOptions = drops.map((d) => ({
    id: d.id,
    round_number: d.round_number,
    ends_at: d.ends_at.toISOString(),
  }))

  return (
    <div>
      {stuck.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-amber-900">확인이 필요한 경매</h2>
          <p className="mt-1 text-sm text-zinc-500">
            마감됐는데 최고입찰자가 계정을 지워 자동 확정되지 못했습니다.
            처리하기 전까지 매분 다시 보고됩니다.
          </p>
          <ul className="mt-3 space-y-3">
            {stuck.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-amber-200 bg-amber-50/40 px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">{a.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      입찰 {a.bid_count}회 · 마감 {kst(a.ends_at)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {won(a.current_price)}
                  </p>
                </div>
                <StuckForm auctionId={a.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <h1 className="text-xl font-semibold tracking-tight">검수 대기</h1>
      <p className="mt-1 text-sm text-zinc-500">
        후원 인증 이미지를 확인하고 승인하거나 반려합니다. 승인하면 고른 회차에 배정됩니다.
      </p>

      {products.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-zinc-300 bg-white px-5 py-12 text-center text-sm text-zinc-600">
          검수할 상품이 없습니다.
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {products.map((p) => (
            <li key={p.id} className="rounded-lg border border-zinc-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {p.funding_project_name} · {p.category} · 상태 {p.condition_grade} · 판매자{' '}
                    {p.seller_nickname}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  시작가 {won(p.start_price)}
                </p>
              </div>

              {/* 검수는 눈으로 보는 일이다. 주소 글자만 보여 주면 확인이 안 된다. */}
              <div className="mt-3 grid gap-4 sm:grid-cols-[auto_1fr]">
                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-700">후원 인증</p>
                  <a href={p.backer_proof_url} target="_blank" rel="noopener noreferrer nofollow">
                    <Photo
                      src={p.backer_proof_url}
                      alt="후원 인증 이미지"
                      className="h-40 w-40 rounded-lg border-2 border-amber-300 object-cover"
                    />
                  </a>
                  <p className="mt-1 w-40 truncate text-[11px] text-zinc-400">
                    {p.backer_proof_url}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-medium text-zinc-700">
                    상품 사진 {p.photo_urls.length}장
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {p.photo_urls.map((url, i) => (
                      <a
                        key={`${url}-${i}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                      >
                        <Photo
                          src={url}
                          alt={`상품 사진 ${i + 1}`}
                          className="h-40 w-40 shrink-0 rounded-lg border border-zinc-200 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <ReviewForm productId={p.id} drops={dropOptions} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

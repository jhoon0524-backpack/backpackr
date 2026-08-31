import { listOpenDrops, listPendingProducts } from '@/lib/db'
import { ReviewForm } from './review-form'
import { won } from '@/lib/format'

export const dynamic = 'force-dynamic'


export default async function AdminReview() {
  const [products, drops] = await Promise.all([listPendingProducts(), listOpenDrops()])
  const dropOptions = drops.map((d) => ({
    id: d.id,
    round_number: d.round_number,
    ends_at: d.ends_at.toISOString(),
  }))

  return (
    <div>
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

              <p className="mt-2 text-xs text-zinc-500">
                사진 {p.photo_urls.length}장 · 후원 인증{' '}
                <span className="rounded bg-zinc-100 px-1.5 py-0.5">{p.backer_proof_url}</span>
              </p>

              <ReviewForm productId={p.id} drops={dropOptions} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRequest } from '@/lib/db'
import { REQUEST_STATUS, daysLeft, kst, kstDate, won } from '@/lib/format'
import { getCurrentUser } from '@/lib/session'
import { CreatorDecision, DeliverForm, OneButton } from './forms'

export const dynamic = 'force-dynamic'

export default async function RequestPage({ params, searchParams }: PageProps<'/requests/[id]'>) {
  const [{ id }, sp, me] = await Promise.all([params, searchParams, getCurrentUser()])
  const r = await getRequest(id)
  if (!r) notFound()

  const isCreator = me?.id === r.creator_id
  const isClient = me?.id === r.client_id
  // 의뢰는 당사자만 본다. 남의 의뢰 주소를 알아도 내용이 보이면 안 된다.
  if (!isCreator && !isClient) notFound()

  const s = REQUEST_STATUS[r.status] ?? { text: r.status, tone: 'bg-fill text-muted' }
  const price = r.final_price ?? r.quoted_price

  return (
    <div className="space-y-6">
      <div>
        <Link href="/me" className="text-xs text-muted hover:text-ink">← 마이페이지</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            <Link href={`/commissions/${r.commission_id}`} className="hover:underline">{r.commission_title}</Link>
          </h1>
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${s.tone}`}>{s.text}</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          창작자 {r.creator_nickname} · 의뢰인 {r.client_nickname} · {kst(r.created_at)} 의뢰
        </p>
      </div>

      {sp.sent && (
        <p className="rounded bg-good-wash px-3 py-2 text-sm text-good">
          의뢰를 보냈습니다. 창작자가 수락하면 여기서 최종가와 마감일을 볼 수 있습니다.
        </p>
      )}

      <section className="rounded-lg bg-white p-5 shadow-card">
        <p className="text-xs text-muted">의뢰 내용</p>
        <p className="mt-1 whitespace-pre-line text-sm text-strong">{r.brief}</p>
        {r.reference_url && (
          <p className="mt-2 text-xs">
            참고 링크: <a href={r.reference_url} target="_blank" rel="noreferrer" className="break-all text-good underline">{r.reference_url}</a>
          </p>
        )}
      </section>

      <section className="rounded-lg bg-white p-5 shadow-card">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">{r.final_price === null ? '기본가' : '최종가'}</dt>
          <dd className="font-semibold">{won(price)}</dd>
          {r.due_at && (
            <>
              <dt className="text-muted">마감일</dt>
              <dd>
                {kstDate(r.due_at)}
                {(r.status === 'accepted' || r.status === 'delivered') && (
                  <span className={`ml-1 text-xs ${daysLeft(r.due_at) < 0 ? 'text-urgent' : 'text-muted'}`}>
                    {daysLeft(r.due_at) < 0 ? `${-daysLeft(r.due_at)}일 지남` : `${daysLeft(r.due_at)}일 남음`}
                  </span>
                )}
              </dd>
            </>
          )}
          {r.decline_reason && (<><dt className="text-muted">거절 사유</dt><dd>{r.decline_reason}</dd></>)}
          {r.delivered_at && (<><dt className="text-muted">전달</dt><dd>{kst(r.delivered_at)}</dd></>)}
          {r.completed_at && (<><dt className="text-muted">완료</dt><dd>{kst(r.completed_at)}</dd></>)}
        </dl>
        {(r.delivery_url || r.delivery_note) && (
          <div className="mt-3 rounded bg-paper p-3 text-sm">
            <p className="text-xs text-muted">전달된 결과물</p>
            {r.delivery_url && (
              <a href={r.delivery_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-good underline">{r.delivery_url}</a>
            )}
            {r.delivery_note && <p className="mt-1 whitespace-pre-line text-strong">{r.delivery_note}</p>}
          </div>
        )}
      </section>

      <section className="rounded-lg bg-white p-5 shadow-card">
        <h2 className="mb-3 text-base font-semibold">{isCreator ? '창작자 할 일' : '의뢰인 할 일'}</h2>
        {isCreator && r.status === 'requested' && <CreatorDecision id={r.id} quotedPrice={r.quoted_price} />}
        {isCreator && r.status === 'accepted' && <DeliverForm id={r.id} />}
        {isCreator && r.status === 'delivered' && <p className="text-sm text-muted">의뢰인이 확인하면 완료됩니다.</p>}
        {isClient && r.status === 'requested' && (
          <OneButton id={r.id} kind="cancel" label="의뢰 취소" help="창작자가 수락하기 전까지만 취소할 수 있습니다." />
        )}
        {isClient && r.status === 'accepted' && <p className="text-sm text-muted">창작자가 작업 중입니다. 전달되면 여기서 확인합니다.</p>}
        {isClient && r.status === 'delivered' && (
          <OneButton id={r.id} kind="complete" label="결과물 확인 · 완료" tone="primary"
            help="확인을 누르면 의뢰가 끝나고 창작자의 자리가 하나 빕니다. 이 뒤로는 되돌릴 수 없습니다." />
        )}
        {['completed', 'declined', 'cancelled'].includes(r.status) && (
          <p className="text-sm text-muted">끝난 의뢰입니다.</p>
        )}
      </section>
    </div>
  )
}

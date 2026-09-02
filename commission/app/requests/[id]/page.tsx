import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRequest } from '@/lib/db'
import { REQUEST_STATUS, daysLeft, kst, kstDate, won } from '@/lib/format'
import { getCurrentUser } from '@/lib/session'
import { BACK, EYEBROW, LINK, NOTICE } from '@/app/ui'
import { CreatorDecision, DeliverForm, OneButton } from './forms'

export const dynamic = 'force-dynamic'

/**
 * 의뢰 상세. 커미션 상세와 같은 두 칸 구조 — 왼쪽에 내용, 오른쪽 고정 패널에 금액·마감과 할 일.
 */
export default async function RequestPage({ params, searchParams }: PageProps<'/requests/[id]'>) {
  const [{ id }, sp, me] = await Promise.all([params, searchParams, getCurrentUser()])
  const r = await getRequest(id)
  if (!r) notFound()

  const isCreator = me?.id === r.creator_id
  const isClient = me?.id === r.client_id
  // 의뢰는 당사자만 본다. 남의 의뢰 주소를 알아도 내용이 보이면 안 된다.
  if (!isCreator && !isClient) notFound()

  const s = REQUEST_STATUS[r.status] ?? { text: r.status, tone: 'bg-fill text-strong' }
  const price = r.final_price ?? r.quoted_price
  const active = r.status === 'accepted' || r.status === 'delivered'

  return (
    <div>
      <div className="mb-6">
        <Link href="/me" className={BACK}>← 내 페이지</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="serif text-[30px] font-bold leading-tight tracking-tight sm:text-[36px]">
            <Link href={`/commissions/${r.commission_id}`} className="inline-flex min-h-11 items-center hover:underline">{r.commission_title}</Link>
          </h1>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.tone}`}>{s.text}</span>
        </div>
        <p className={EYEBROW + ' mt-2'}>
          창작자 {r.creator_nickname} · 의뢰인 {r.client_nickname} · {kst(r.created_at)} 의뢰
        </p>
      </div>

      {sp.sent && (
        <p className={NOTICE + ' mb-6'}>
          의뢰를 보냈습니다. 창작자가 수락하면 여기서 최종가와 마감일을 볼 수 있습니다.
        </p>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <section>
            <h2 className="serif text-xl font-bold">의뢰 내용</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-strong">{r.brief}</p>
            {r.reference_url && (
              <p className="mt-3 text-sm">
                참고 링크 <a href={r.reference_url} target="_blank" rel="noreferrer" className={LINK}>{r.reference_url}</a>
              </p>
            )}
          </section>

          {r.decline_reason && (
            <section className="mt-8 border-t border-line pt-6">
              <h2 className="serif text-xl font-bold">거절 사유</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-strong">{r.decline_reason}</p>
            </section>
          )}

          {(r.delivery_url || r.delivery_note) && (
            <section className="mt-8 border-t border-line pt-6">
              <h2 className="serif text-xl font-bold">전달된 결과물</h2>
              {r.delivery_url && (
                <a href={r.delivery_url} target="_blank" rel="noreferrer" className={LINK + ' mt-2'}>{r.delivery_url}</a>
              )}
              {r.delivery_note && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-strong">{r.delivery_note}</p>}
            </section>
          )}

          <section className="mt-8 border-t border-line pt-6">
            <h2 className="serif text-xl font-bold">기록</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li>{kst(r.created_at)} 의뢰</li>
              {r.accepted_at && <li>{kst(r.accepted_at)} 수락</li>}
              {r.delivered_at && <li>{kst(r.delivered_at)} 전달</li>}
              {r.completed_at && <li>{kst(r.completed_at)} 완료</li>}
            </ul>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="border border-ink p-6">
            <dl className="space-y-4">
              <div>
                {/* 커미션 상세와 같은 말 "기본 가격". 수락 전 금액이 확정가처럼 읽히지 않게 한 줄 덧붙인다 (UI/UX 1회차 발견 7). */}
                <dt className={EYEBROW}>{r.final_price === null ? '기본 가격' : '최종가'}</dt>
                <dd className="serif num mt-1 text-[32px] font-bold leading-none">{won(price)}</dd>
                {r.final_price === null && r.status === 'requested' && (
                  <dd className="mt-2 text-[13px] text-muted">창작자가 수락하며 최종가를 정합니다.</dd>
                )}
              </div>
              {r.due_at && (
                <div>
                  <dt className={EYEBROW}>마감일</dt>
                  <dd className="serif num mt-1 text-xl font-bold">
                    {kstDate(r.due_at)}
                    {active && (
                      <span className={`ml-2 text-sm font-semibold ${daysLeft(r.due_at) < 0 ? 'text-urgent-text' : 'text-muted'}`}>
                        {daysLeft(r.due_at) < 0 ? `${-daysLeft(r.due_at)}일 지남` : `${daysLeft(r.due_at)}일 남음`}
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-6 border-t border-ink pt-6">
              {isCreator && r.status === 'requested' && (
                <CreatorDecision id={r.id} quotedPrice={r.quoted_price} maxSlots={r.max_slots} activeCount={r.active_count}
                  dueAtIfNow={r.due_at_if_now.toISOString()} />
              )}
              {isCreator && r.status === 'accepted' && <DeliverForm id={r.id} />}
              {isCreator && r.status === 'delivered' && <p className="text-sm text-muted">의뢰인이 확인하면 완료됩니다.</p>}
              {isClient && r.status === 'requested' && (
                <OneButton id={r.id} kind="cancel" label="의뢰 취소" help="창작자가 수락하기 전까지만 취소할 수 있습니다." />
              )}
              {isClient && r.status === 'accepted' && <p className="text-sm text-muted">창작자가 작업 중입니다. 전달되면 여기서 확인합니다.</p>}
              {isClient && r.status === 'delivered' && (
                <OneButton id={r.id} kind="complete" label="결과물 확인 · 완료" tone="primary"
                  help="확인을 누르면 의뢰가 끝나고 창작자의 자리가 하나 빕니다."
                  confirm="결과물을 확인했고 이 의뢰를 끝냅니다. 끝낸 뒤에는 되돌릴 수 없습니다." />
              )}
              {['completed', 'declined', 'cancelled'].includes(r.status) && (
                <p className="text-sm text-muted">끝난 의뢰입니다.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCommission } from '@/lib/db'
import { kstDate, won } from '@/lib/format'
import { getCurrentUser } from '@/lib/session'
import { Photo } from '@/app/photo'
import { SlotText } from '@/app/commission-card'
import { BACK, BTN_SECONDARY, CHIP } from '@/app/ui'
import { RequestForm } from './request-form'

export const dynamic = 'force-dynamic'

/**
 * 텀블벅 프로젝트 상세를 따랐다.
 * 위: 분류 칩 → 큰 제목 → 창작자 한 줄. 그 아래 왼쪽에 사진과 설명(스토리 자리),
 * 오른쪽에 고정 패널(모인 금액 자리에 가격·기간·자리, 그 밑에 큰 피치 버튼 = 의뢰 폼).
 * 좁은 화면에서는 위아래로 쌓인다.
 */
export default async function CommissionPage({ params }: PageProps<'/commissions/[id]'>) {
  const { id } = await params
  const [c, me] = await Promise.all([getCommission(id), getCurrentUser()])
  if (!c) notFound()

  const isMine = me?.id === c.creator_id
  const left = c.max_slots - c.active_count

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className={BACK}>← 커미션 둘러보기</Link>
        <div className="mt-1"><span className={CHIP}>{c.category}</span></div>
        <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">{c.title}</h1>
        <p className="mt-2 text-[15px] text-strong">
          <span className="font-semibold">{c.creator_nickname}</span>
          {c.creator_bio && <span className="text-muted"> · {c.creator_bio}</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          {/* 텀블벅 상세의 큰 대표 이미지(16:10). 나머지 샘플은 그 밑에 작게. */}
          {c.sample_urls.length > 0 ? (
            <>
              <div className="aspect-[16/10] overflow-hidden rounded-lg bg-fill">
                <Photo src={c.sample_urls[0]} alt="샘플 1" className="h-full w-full object-cover" />
              </div>
              {c.sample_urls.length > 1 && (
                <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {c.sample_urls.slice(1).map((u, i) => (
                    <li key={i} className="aspect-square overflow-hidden rounded-md bg-fill">
                      <Photo src={u} alt={`샘플 ${i + 2}`} className="h-full w-full object-cover" />
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-fill text-sm text-muted">
              샘플 이미지가 없습니다
            </div>
          )}

          <section className="mt-8 border-t border-line pt-6">
            <h2 className="text-lg font-bold">작업 안내</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-strong">{c.description}</p>
          </section>

          <section className="mt-8 border-t border-line pt-6">
            <h2 className="text-lg font-bold">진행 방식</h2>
            <ol className="mt-3 space-y-2 text-[15px] leading-relaxed text-strong">
              <li><span className="num mr-2 font-bold text-urgent-text">1</span>의뢰 내용을 보내면 창작자가 확인합니다. 보내는 것은 무료입니다.</li>
              <li><span className="num mr-2 font-bold text-urgent-text">2</span>창작자가 최종가를 정해 수락하면 그날부터 {c.turnaround_days}일 안에 작업합니다.</li>
              <li><span className="num mr-2 font-bold text-urgent-text">3</span>결과물을 전달받고 확인하면 완료됩니다.</li>
            </ol>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-line p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted">기본 가격</dt>
                <dd className="num mt-1 text-[28px] font-bold leading-none text-ink">
                  {won(c.price)}<span className="ml-1 text-base font-medium text-muted">부터</span>
                </dd>
              </div>
              <div className="flex gap-8">
                <div>
                  <dt className="text-sm text-muted">작업 기간</dt>
                  <dd className="num mt-1 text-xl font-bold">{c.turnaround_days}일</dd>
                </div>
                <div>
                  {/* 열기 폼의 "동시 진행 건수" 와 같은 말을 쓴다 (UI/UX 1회차 발견 7). */}
                  <dt className="text-sm text-muted">동시 진행 {c.max_slots}건</dt>
                  <dd className="mt-1 text-xl">
                    <SlotText active={c.active_count} max={c.max_slots} status={c.status} />
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-6 border-t border-line pt-6">
              {!me ? (
                <p className="text-sm text-muted">의뢰하려면 먼저 오른쪽 위에서 사용자를 골라 주세요.</p>
              ) : isMine ? (
                <>
                  <p className="text-sm text-muted">내 커미션입니다. 들어온 의뢰는 마이페이지에서 봅니다.</p>
                  <Link href="/me" className={BTN_SECONDARY + ' mt-4'}>마이페이지로</Link>
                </>
              ) : c.status !== 'open' ? (
                <p className="text-sm text-muted">지금은 의뢰를 받지 않습니다.</p>
              ) : left <= 0 ? (
                <>
                  {/* "왜" 만 있고 "언제·그럼 뭘" 이 없어 막다른 곳이었다 (UI/UX 1회차 발견 8). */}
                  <p className="text-sm leading-relaxed text-strong">
                    진행 가능한 자리가 모두 찼습니다. 작업이 하나 끝나면 다시 열립니다.
                    {c.next_free_at && <> 가장 이른 마감은 <span className="num font-semibold">{kstDate(c.next_free_at)}</span>입니다.</>}
                  </p>
                  <Link href="/" className={BTN_SECONDARY + ' mt-4'}>다른 커미션 둘러보기</Link>
                </>
              ) : (
                <RequestForm commissionId={c.id} />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

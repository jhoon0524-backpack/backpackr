import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCommission } from '@/lib/db'
import { kstDate, won } from '@/lib/format'
import { getCurrentUser } from '@/lib/session'
import { Photo } from '@/app/photo'
import { SlotText } from '@/app/commission-card'
import { BACK, BTN_PRIMARY, BTN_SECONDARY, EYEBROW, H2 } from '@/app/ui'
import { RequestForm } from './request-form'

export const dynamic = 'force-dynamic'

/**
 * 작품 상세. 위에 꼬리표 → 큰 명조 제목. 사진은 4:5 세로.
 * 그 아래 세 칸(기본 가격·작업 기간·동시 진행)을 괘선으로 나눈 표, 작업 안내, 진행 방식.
 * 넓은 화면은 오른쪽에 고정 패널(의뢰 폼). 좁은 화면은 화면 아래에 금액과 [의뢰하기] 막대가 붙어 있고
 * 누르면 폼으로 내려간다 — 텀블벅 모바일의 "후원하기" 자리다.
 */
export default async function CommissionPage({ params }: PageProps<'/commissions/[id]'>) {
  const { id } = await params
  const [c, me] = await Promise.all([getCommission(id), getCurrentUser()])
  if (!c) notFound()

  const isMine = me?.id === c.creator_id
  const left = c.max_slots - c.active_count
  const canRequest = !!me && !isMine && c.status === 'open' && left > 0

  return (
    <div className="pb-24 lg:pb-0">
      <div className="mb-6 flex flex-col gap-2">
        <Link href="/" className={BACK}>← 둘러보기</Link>
        <p className={EYEBROW}>{c.category} · {c.creator_nickname}의 작업실</p>
        <h1 className="serif text-[34px] font-bold leading-[1.15] tracking-tight sm:text-[44px]">{c.title}</h1>
        {c.creator_bio && <p className="text-[15px] leading-relaxed text-strong">{c.creator_bio}</p>}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="relative -mx-5 sm:mx-0">
            {c.sample_urls.length > 0 ? (
              <div className="aspect-[4/5] overflow-hidden bg-fill sm:rounded-sm">
                <Photo src={c.sample_urls[0]} alt="샘플 1" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="serif flex aspect-[4/5] items-center justify-center bg-fill text-5xl font-bold text-faint sm:rounded-sm">Aa</div>
            )}
            <div className="absolute right-4 top-4">
              <SlotText active={c.active_count} max={c.max_slots} status={c.status} size="md" />
            </div>
          </div>
          {c.sample_urls.length > 1 && (
            <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {c.sample_urls.slice(1).map((u, i) => (
                <li key={i} className="aspect-square overflow-hidden rounded-sm bg-fill">
                  <Photo src={u} alt={`샘플 ${i + 2}`} className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
          )}

          <dl className="num mt-6 grid grid-cols-3 border-b border-ink">
            <div className="flex flex-col gap-1 border-r border-line py-4 pr-3">
              <dt className={EYEBROW}>기본 가격</dt>
              <dd className="serif whitespace-nowrap text-xl font-bold sm:text-2xl">{won(c.price)}<span className="text-xs font-normal text-muted">부터</span></dd>
            </div>
            <div className="flex flex-col gap-1 border-r border-line px-3 py-4">
              <dt className={EYEBROW}>작업 기간</dt>
              <dd className="serif text-xl font-bold sm:text-2xl">{c.turnaround_days}<span className="text-xs font-normal text-muted">일</span></dd>
            </div>
            <div className="flex flex-col gap-1 py-4 pl-3">
              <dt className={EYEBROW}>동시 진행</dt>
              <dd className="serif text-xl font-bold sm:text-2xl">{c.active_count}<span className="text-xs font-normal text-muted">/{c.max_slots}</span></dd>
            </div>
          </dl>

          <section className="border-b border-line py-6">
            <h2 className="serif text-xl font-bold">작업 안내</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.75] text-strong">{c.description}</p>
          </section>

          <section className="py-6">
            <h2 className="serif text-xl font-bold">진행 방식</h2>
            <ol className="mt-4 space-y-4 text-[15px] leading-relaxed text-strong">
              {[
                '의뢰 내용을 보내면 창작자가 확인합니다. 보내는 것은 무료입니다.',
                `창작자가 최종가를 정해 수락하면 그날부터 ${c.turnaround_days}일 안에 작업합니다.`,
                '결과물을 전달받고 확인하면 완료됩니다.',
              ].map((t, i) => (
                <li key={i} className="flex gap-4">
                  <span className="serif num w-7 shrink-0 text-[28px] font-bold leading-none text-urgent-text">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside id="request" className="scroll-mt-32 lg:sticky lg:top-24 lg:self-start">
          <div className="border border-ink p-6">
            <h2 className={H2}>의뢰하기</h2>
            <div className="pt-5">
              {!me ? (
                <p className="text-sm leading-relaxed text-strong">의뢰하려면 먼저 오른쪽 위에서 사용자를 골라 주세요.</p>
              ) : isMine ? (
                <>
                  <p className="text-sm leading-relaxed text-strong">내가 연 작업실입니다. 들어온 의뢰는 내 페이지에서 봅니다.</p>
                  <Link href="/me" className={BTN_SECONDARY + ' mt-4'}>내 페이지로</Link>
                </>
              ) : c.status !== 'open' ? (
                <>
                  <p className="text-sm leading-relaxed text-strong">창작자가 이 작업실을 닫아 두었습니다. 다시 열리면 여기서 의뢰할 수 있습니다.</p>
                  <Link href="/" className={BTN_SECONDARY + ' mt-4'}>작업실 둘러보기</Link>
                </>
              ) : left <= 0 ? (
                <>
                  <p className="text-sm leading-relaxed text-strong">
                    진행 가능한 자리가 모두 찼습니다. 작업이 하나 끝나면 다시 열립니다.
                    {c.next_free_at && <> 가장 이른 마감은 <span className="num font-semibold">{kstDate(c.next_free_at)}</span>입니다.</>}
                  </p>
                  <Link href="/" className={BTN_SECONDARY + ' mt-4'}>작업실 둘러보기</Link>
                </>
              ) : (
                <RequestForm commissionId={c.id} />
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* 좁은 화면 아래 고정 막대. 넓은 화면은 오른쪽 패널이 그 역할을 한다. */}
      {canRequest && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-ink bg-paper/95 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-[1100px] items-center gap-4 px-5 py-3">
            <div className="num flex min-w-0 flex-col">
              <span className="serif text-lg font-bold leading-tight">{won(c.price)}~</span>
              <span className="text-xs text-muted">보내는 것은 무료</span>
            </div>
            <a href="#request" className={BTN_PRIMARY + ' ml-auto !w-auto px-8'}>의뢰하기</a>
          </div>
        </div>
      )}
    </div>
  )
}

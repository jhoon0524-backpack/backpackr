import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCommission } from '@/lib/db'
import { kstDate, trustFromFunding, won } from '@/lib/format'
import { FundingRecord } from '@/app/funding-record'
import { getCurrentUser } from '@/lib/session'
import { Photo } from '@/app/photo'
import { SlotOverlay, TitleField } from '@/app/commission-card'
import { BACK, BTN_INK, BTN_PRIMARY, BTN_SECONDARY, EYEBROW, H2, NOTICE } from '@/app/ui'
import { RequestForm } from './request-form'

export const dynamic = 'force-dynamic'

/**
 * 전단 한 장을 크게 펼친 상세. 정사각 사진에 스티커, 검은고딕 제목, 검정 테두리 3칸 표(기본 가격·작업 기간·동시 진행),
 * 검정 막대 제목의 안내와 진행 순서. 넓은 화면은 오른쪽 고정 패널(의뢰 폼), 좁은 화면은 아래 고정 막대가 폼으로 내려보낸다.
 */
export default async function CommissionPage({ params, searchParams }: PageProps<'/commissions/[id]'>) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const [c, me] = await Promise.all([getCommission(id), getCurrentUser()])
  if (!c) notFound()

  const trust = trustFromFunding({
    backer_count: c.creator_backer_count,
    satisfaction: c.creator_satisfaction,
    satisfaction_count: c.creator_satisfaction_count,
  })
  const isMine = me?.id === c.creator_id
  const left = c.max_slots - c.active_count
  const canRequest = !!me && !isMine && c.status === 'open' && left > 0

  return (
    <div className="pb-28 lg:pb-0">
      <Link href="/" className={BACK}>← 메뉴판</Link>
      {sp.updated && <p className={NOTICE + ' mt-1'}>메뉴를 고쳤어요. 주소는 그대로라 이미 보낸 링크도 이 내용으로 보여요.</p>}

      <div className="mt-2 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="relative border-[3px] border-ink bg-fill">
            {c.sample_urls.length > 0 ? (
              <div className="aspect-square overflow-hidden">
                <Photo src={c.sample_urls[0]} alt="샘플 1" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="aspect-square"><TitleField title={c.title} closed={c.status !== 'open'} big /></div>
            )}
            <SlotOverlay active={c.active_count} max={c.max_slots} status={c.status} size="md" />
          </div>
          {c.sample_urls.length > 1 && (
            <ul className="mt-8 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {c.sample_urls.slice(1).map((u, i) => (
                <li key={i} className="aspect-square overflow-hidden border-[3px] border-ink bg-fill">
                  <Photo src={u} alt={`샘플 ${i + 2}`} className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-9 flex flex-col gap-2">
            <p className={EYEBROW}>{c.category} · {c.creator_nickname}</p>
            <h1 className="disp text-[38px] leading-[1.05] text-ink sm:text-[52px]">{c.title}</h1>
            {c.creator_bio && <p className="text-[15px] font-medium leading-relaxed text-strong">{c.creator_bio}</p>}
            {/*
              텀블벅 펀딩 이력. 이 서비스의 차별점이 여기 한 줄에 걸려 있다 —
              신규 커미션 플랫폼은 후기 0에서 시작하지만 여기는 첫날부터 차 있다.
              목록 카드에는 일부러 넣지 않았다. 카드마다 숫자를 박으면 상위 몇 명에게 의뢰가 쏠리는데,
              커미션은 오히려 작은 창작자에게 더 필요한 수입원이다. 결정 직전인 상세에서만 보여준다.
            */}
            {trust && <div className="mt-2"><FundingRecord trust={trust} /></div>}
          </div>

          <dl className="num mt-6 grid grid-cols-3 border-[3px] border-ink bg-white">
            <div className="flex flex-col gap-1 border-r-[3px] border-ink p-3">
              <dt className={EYEBROW}>기본 가격</dt>
              <dd className="disp whitespace-nowrap text-[20px] sm:text-[24px]">{won(c.price)}<span className="text-xs">~</span></dd>
            </div>
            <div className="flex flex-col gap-1 border-r-[3px] border-ink p-3">
              <dt className={EYEBROW}>작업 기간</dt>
              <dd className="disp text-[20px] sm:text-[24px]">{c.turnaround_days}<span className="text-xs">일</span></dd>
            </div>
            <div className="flex flex-col gap-1 p-3">
              <dt className={EYEBROW}>동시 진행</dt>
              <dd className="disp text-[20px] sm:text-[24px]">{c.active_count}<span className="text-xs">/{c.max_slots}</span></dd>
            </div>
          </dl>

          <section className="mt-9 flex flex-col gap-3">
            <h2 className={H2}>작업 안내</h2>
            <p className="whitespace-pre-line text-[15px] font-medium leading-[1.75] text-ink">{c.description}</p>
          </section>

          <section className="mt-8 flex flex-col gap-3">
            <h2 className={H2}>이렇게 진행돼요</h2>
            <ol className="flex flex-col gap-3 text-[15px] font-medium leading-relaxed text-ink">
              {[
                '의뢰 내용을 보내면 창작자가 확인해요. 보내는 건 무료.',
                `창작자가 최종가를 정해 수락하면 그날부터 ${c.turnaround_days}일 안에 작업해요.`,
                '결과물을 받고 확인하면 끝.',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="disp num flex h-9 w-9 shrink-0 items-center justify-center border-[3px] border-ink bg-white text-lg">{i + 1}</span>
                  <span className="pt-1.5">{t}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside id="request" className="scroll-mt-40 lg:sticky lg:top-32 lg:self-start">
          <div className="border-[3px] border-ink bg-white p-5">
            <h2 className={H2}>의뢰하기</h2>
            <div className="pt-5">
              {!me ? (
                <p className="text-sm font-medium leading-relaxed text-strong">의뢰하려면 먼저 오른쪽 위에서 사용자를 골라 주세요.</p>
              ) : isMine ? (
                <>
                  <p className="text-sm font-medium leading-relaxed text-strong">내가 붙인 메뉴예요. 들어온 의뢰는 내 것에서 봅니다.</p>
                  <Link href={`/commissions/${c.id}/edit`} className={BTN_INK + ' mt-4'}>메뉴 고치기</Link>
                  <Link href="/me" className={BTN_SECONDARY + ' mt-2'}>내 것으로</Link>
                </>
              ) : c.status !== 'open' ? (
                <>
                  <p className="text-sm font-medium leading-relaxed text-strong">창작자가 이 메뉴를 내려 두었어요. 다시 붙으면 여기서 의뢰할 수 있어요.</p>
                  <Link href="/" className={BTN_SECONDARY + ' mt-4'}>메뉴판으로</Link>
                </>
              ) : left <= 0 ? (
                <>
                  <p className="text-sm font-medium leading-relaxed text-strong">
                    자리가 다 찼어요. 작업이 하나 끝나면 다시 열려요.
                    {c.next_free_at && <> 가장 이른 마감은 <span className="num font-bold">{kstDate(c.next_free_at)}</span>이에요.</>}
                  </p>
                  <Link href="/" className={BTN_SECONDARY + ' mt-4'}>메뉴판으로</Link>
                </>
              ) : (
                <RequestForm commissionId={c.id} />
              )}
            </div>
          </div>
        </aside>
      </div>

      {canRequest && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-ink bg-white lg:hidden">
          <div className="mx-auto flex max-w-[1100px] items-center gap-4 px-4 py-3">
            <div className="num flex min-w-0 flex-col">
              <span className="disp text-[22px] leading-none">{won(c.price)}~</span>
              <span className="text-xs font-bold text-muted">보내는 건 무료</span>
            </div>
            <a href="#request" className={BTN_PRIMARY + ' ml-auto !w-auto px-7'}>의뢰하기</a>
          </div>
        </div>
      )}
    </div>
  )
}

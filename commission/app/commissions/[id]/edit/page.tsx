import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CATEGORIES, getCommission } from '@/lib/db'
import { commissionToValues } from '@/lib/commission-input'
import { getCurrentUser } from '@/lib/session'
import { CommissionForm } from '@/app/commission-form'
import { BACK, EYEBROW } from '@/app/ui'
import { saveCommission } from './actions'

export const dynamic = 'force-dynamic'

/**
 * 붙인 메뉴 고치기. 주소가 그대로라 이미 공유한 링크가 살아 있다 — 내리고 새로 붙이는 것과 다른 점이다.
 * 붙이기와 같은 폼을 쓰고, 기존 값을 채워 넣는다.
 */
export default async function EditCommissionPage({ params }: PageProps<'/commissions/[id]/edit'>) {
  const { id } = await params
  const [c, me] = await Promise.all([getCommission(id), getCurrentUser()])
  // 남의 메뉴 고치는 화면은 존재를 알리지 않는다.
  if (!c || !me || me.id !== c.creator_id) notFound()

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex flex-col gap-2">
        <Link href={`/commissions/${c.id}`} className={BACK}>← 메뉴로</Link>
        <p className={EYEBROW}>내가 붙인 메뉴</p>
        <h1 className="disp text-[44px] leading-none">메뉴 고치기</h1>
        <p className="text-[15px] font-medium leading-relaxed text-strong">
          주소는 그대로예요. 이미 보낸 링크가 그대로 살아 있습니다.
          {c.active_count > 0 && (
            <> 지금 <span className="num font-bold">{c.active_count}건</span>이 진행 중이라, 동시 진행 건수를 그보다 작게는 줄일 수 없어요.</>
          )}
        </p>
        <p className="text-[13px] font-medium text-muted">
          이미 들어온 의뢰는 이 수정에 영향받지 않아요. 각자 의뢰할 때의 금액과 마감일을 그대로 갖고 갑니다.
        </p>
      </div>
      <CommissionForm
        categories={CATEGORIES}
        action={saveCommission}
        initial={commissionToValues(c)}
        commissionId={c.id}
        submitLabel="고친 내용 저장"
        pendingLabel="저장하는 중…"
      />
    </div>
  )
}

import Link from 'next/link'
import { listOpenCommissions } from '@/lib/db'
import { CommissionCard } from './commission-card'
import { BTN_INK } from './ui'

export const dynamic = 'force-dynamic'

export default async function CommissionList() {
  const commissions = await listOpenCommissions()

  return (
    <div>
      <div className="flex flex-col gap-2 pb-6">
        <h1 className="disp text-[44px] leading-[1.02] text-ink sm:text-[64px]">이번 달<br />받는 작업</h1>
        <p className="text-[15px] font-medium leading-relaxed text-strong">창작자가 붙여 둔 메뉴판. 자리 있는 것부터 골라 보세요.</p>
      </div>

      {commissions.length === 0 ? (
        <div className="border-[3px] border-ink bg-white p-8 text-center shadow-hard">
          <p className="disp text-2xl">아직 붙은 메뉴가 없어요.</p>
          <p className="mt-2 text-sm font-medium text-muted">창작자라면 첫 메뉴를 붙여 보세요.</p>
          <Link href="/open" className={BTN_INK + ' mt-6 !w-auto'}>메뉴 붙이기</Link>
        </div>
      ) : (
        /* 스티커가 카드 밖으로 삐져나오므로 위쪽과 오른쪽에 숨 쉴 자리를 둔다. */
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 pr-2 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {commissions.map((c) => (
            <li key={c.id}><CommissionCard c={c} /></li>
          ))}
        </ul>
      )}

      <div className="mt-12 flex flex-col gap-2 border-[3px] border-ink bg-yellow p-6 shadow-hard">
        <p className="disp text-[28px] leading-none">그리는 분이세요?</p>
        <p className="text-sm font-medium leading-relaxed text-strong">받고 싶은 작업 하나를 메뉴로 붙여 두면, 의뢰가 들어와요.</p>
        <Link href="/open" className={BTN_INK + ' mt-3 sm:!w-auto'}>메뉴 붙이기</Link>
      </div>
    </div>
  )
}

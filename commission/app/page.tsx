import Link from 'next/link'
import { listOpenCommissions } from '@/lib/db'
import { CommissionCard } from './commission-card'
import { BTN_PRIMARY } from './ui'

export const dynamic = 'force-dynamic'

export default async function CommissionList() {
  const commissions = await listOpenCommissions()

  return (
    <div>
      {/* 텀블벅 목록 페이지 머리 — 큰 제목 하나, 아래 한 줄 설명, 오른쪽에 건수. */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">커미션 둘러보기</h1>
          <p className="mt-1.5 text-[15px] text-muted">창작자가 지금 받고 있는 맞춤 작업입니다.</p>
        </div>
        <p className="num shrink-0 text-sm text-muted">{commissions.length}개</p>
      </div>

      {commissions.length === 0 ? (
        <div className="rounded-lg border border-line px-5 py-16 text-center">
          <p className="text-[15px] font-semibold text-ink">지금 열려 있는 커미션이 없습니다.</p>
          <p className="mt-1.5 text-sm text-muted">창작자라면 첫 커미션을 열어 보세요.</p>
          <Link href="/open" className={BTN_PRIMARY + ' mt-6 !w-auto'}>커미션 열기</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {commissions.map((c) => (
            <li key={c.id}><CommissionCard c={c} /></li>
          ))}
        </ul>
      )}
    </div>
  )
}

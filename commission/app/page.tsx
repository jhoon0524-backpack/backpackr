import { listOpenCommissions } from '@/lib/db'
import { CommissionCard } from './commission-card'

export const dynamic = 'force-dynamic'

export default async function CommissionList() {
  const commissions = await listOpenCommissions()

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">열려 있는 커미션</h1>
        <p className="mt-1 text-sm text-muted">
          창작자가 지금 받고 있는 맞춤 작업입니다. 자리가 남은 곳에 의뢰할 수 있습니다.
        </p>
      </div>

      {commissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-12 text-center">
          <p className="text-sm text-strong">지금 열려 있는 커미션이 없습니다.</p>
          <p className="mt-1 text-xs text-muted">창작자라면 위의 &ldquo;커미션 열기&rdquo; 에서 첫 커미션을 열어 보세요.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {commissions.map((c) => (
            <li key={c.id}><CommissionCard c={c} /></li>
          ))}
        </ul>
      )}
    </div>
  )
}

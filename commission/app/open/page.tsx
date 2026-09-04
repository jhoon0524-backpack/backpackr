import { CATEGORIES } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { EYEBROW } from '@/app/ui'
import { CommissionForm } from '@/app/commission-form'
import { openCommission } from './actions'

export const dynamic = 'force-dynamic'

export default async function OpenPage() {
  const me = await getCurrentUser()
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex flex-col gap-2">
        <p className={EYEBROW}>창작자</p>
        <h1 className="disp text-[44px] leading-none">메뉴 붙이기</h1>
        <p className="text-[15px] font-medium leading-relaxed text-strong">받고 싶은 작업 하나를 메뉴로 만들어요. 반신·전신·로고처럼 여러 장 붙일 수 있어요.</p>
      </div>
      {!me ? (
        <div className="border-[3px] border-ink bg-white p-8 text-center">
          <p className="disp text-2xl text-ink">먼저 오른쪽 위에서 사용자를 골라 주세요.</p>
          <p className="mt-1.5 text-sm text-muted">로그인 기능이 생기기 전까지는 사용자 전환기로 대신합니다.</p>
        </div>
      ) : (
        <CommissionForm
          categories={CATEGORIES}
          action={openCommission}
          submitLabel="메뉴 붙이기"
          pendingLabel="붙이는 중…"
        />
      )}
    </div>
  )
}

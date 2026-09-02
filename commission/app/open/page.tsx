import { CATEGORIES } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { OpenForm } from './form'

export const dynamic = 'force-dynamic'

export default async function OpenPage() {
  const me = await getCurrentUser()
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">커미션 열기</h1>
        <p className="mt-1 text-sm text-muted">받고 싶은 작업 하나를 메뉴로 만듭니다. 반신·전신·로고처럼 여러 개를 열 수 있습니다.</p>
      </div>
      {!me ? (
        <div className="rounded-lg border border-dashed border-line bg-white px-5 py-12 text-center">
          <p className="text-sm text-strong">먼저 위쪽에서 사용자를 골라 주세요.</p>
          <p className="mt-1 text-xs text-muted">로그인이 붙기 전까지는 사용자 전환기로 대신합니다.</p>
        </div>
      ) : (
        <div className="rounded-lg bg-white p-5 shadow-card">
          <OpenForm categories={CATEGORIES} />
        </div>
      )}
    </div>
  )
}

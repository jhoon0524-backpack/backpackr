import { CATEGORIES } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { EYEBROW } from '@/app/ui'
import { OpenForm } from './form'

export const dynamic = 'force-dynamic'

export default async function OpenPage() {
  const me = await getCurrentUser()
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex flex-col gap-2">
        <p className={EYEBROW}>창작자</p>
        <h1 className="serif text-[36px] font-bold leading-tight tracking-tight">작업실 열기</h1>
        <p className="text-[15px] leading-relaxed text-strong">받고 싶은 작업 하나를 메뉴로 만듭니다. 반신·전신·로고처럼 여러 개를 열 수 있습니다.</p>
      </div>
      {!me ? (
        <div className="border-t border-ink py-16 text-center">
          <p className="serif text-xl font-bold text-ink">먼저 오른쪽 위에서 사용자를 골라 주세요.</p>
          <p className="mt-1.5 text-sm text-muted">로그인이 붙기 전까지는 사용자 전환기로 대신합니다.</p>
        </div>
      ) : (
        <OpenForm categories={CATEGORIES} />
      )}
    </div>
  )
}

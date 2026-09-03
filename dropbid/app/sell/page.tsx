import Link from 'next/link'
import { SellForm } from './form'
import { isConfigured } from '@/lib/storage'
import { getCurrentUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function SellPage() {
  const me = await getCurrentUser()

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">상품 등록</h1>
      <p className="mt-1 text-sm text-muted">
        등록하면 검수 대기 상태가 됩니다. 운영자가 후원 인증을 확인한 뒤 다음 드롭에 배정합니다.
      </p>

      {/* 다 채우고 누른 뒤에야 막히면 헛수고가 된다. 먼저 막는다. */}
      {!me ? (
        <div className="mt-5 rounded-lg border border-dashed border-line bg-white px-5 py-8 text-center text-sm text-strong">
          위쪽에서 사용자를 고르면 상품을 등록할 수 있습니다.
          <br />
          <span className="text-xs text-muted">카카오 로그인이 붙으면 이 선택은 사라집니다.</span>
        </div>
      ) : !me.phone ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-5 py-8 text-center text-sm text-amber-900">
          연락처가 등록되어 있지 않아 상품을 등록할 수 없습니다.
          <br />
          <Link href="/me" className="text-xs underline">
            마이페이지에서 연락처 확인하기
          </Link>
        </div>
      ) : (
        <SellForm canUpload={isConfigured()} />
      )}
    </div>
  )
}

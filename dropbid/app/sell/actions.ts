'use server'

import { redirect } from 'next/navigation'
import { createProduct } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export type SellState = { message: string; values: Record<string, string> } | null

export async function submitProduct(_prev: SellState, formData: FormData): Promise<SellState> {
  const raw = Object.fromEntries(
    ['title', 'fundingProjectName', 'fundingProjectUrl', 'category', 'conditionGrade',
     'photoUrls', 'backerProofUrl', 'startPrice'].map((k) => [k, String(formData.get(k) ?? '')]),
  )
  // 실패해도 입력값은 남긴다 (PRD 화면 상태 설계).
  const fail = (message: string): SellState => ({ message, values: raw })

  const me = await getCurrentUser()
  if (!me) return fail('먼저 위쪽에서 사용자를 골라 주세요.')
  if (!me.phone) return fail('연락처가 등록되어 있지 않아 상품을 등록할 수 없습니다.')

  const photoUrls = raw.photoUrls.split('\n').map((s) => s.trim()).filter(Boolean)
  if (photoUrls.length < 3) return fail('사진을 3장 이상 넣어 주세요.')
  if (!raw.backerProofUrl.trim()) return fail('후원 인증 이미지가 없으면 등록할 수 없습니다.')

  const startPrice = Number(raw.startPrice)
  if (!Number.isInteger(startPrice) || startPrice < 1000) {
    return fail('시작가는 1,000원 이상이어야 합니다.')
  }
  if (!raw.title.trim() || !raw.fundingProjectName.trim()) {
    return fail('상품명과 원 펀딩 프로젝트명을 채워 주세요.')
  }

  try {
    await createProduct({
      sellerId: me.id,
      title: raw.title.trim(),
      fundingProjectName: raw.fundingProjectName.trim(),
      fundingProjectUrl: raw.fundingProjectUrl.trim() || null,
      category: raw.category,
      conditionGrade: raw.conditionGrade,
      photoUrls,
      backerProofUrl: raw.backerProofUrl.trim(),
      startPrice,
    })
  } catch {
    return fail('등록하지 못했습니다. 입력값을 확인해 주세요.')
  }

  redirect('/me')
}

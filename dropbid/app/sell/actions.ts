'use server'

import { redirect } from 'next/navigation'
import { createProduct } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { isConfigured, uploadImages } from '@/lib/storage'

/**
 * 빈 파일 칸도 FormData 에는 이름이 들어온다 (크기 0, 이름 "").
 * 걸러내지 않으면 "사진 0장을 올렸다" 가 되어 조용히 빈 목록이 저장된다.
 */
const isRealFile = (v: FormDataEntryValue): v is File =>
  typeof v === 'object' && 'size' in v && v.size > 0

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

  /*
    사진은 두 길로 들어온다.
    - 스토리지가 설정돼 있으면 파일을 받아 올리고 그 주소를 쓴다 (판매자는 휴대폰으로 찍는다)
    - 설정이 없으면 예전처럼 주소를 붙여넣는다. 열쇠가 없다고 등록 자체가 막히면 안 된다
  */
  const photoFiles = formData.getAll('photoFiles').filter(isRealFile)
  const proofFile = formData.getAll('proofFile').filter(isRealFile)[0]

  let photoUrls: string[]
  if (isConfigured() && photoFiles.length > 0) {
    if (photoFiles.length < 3) return fail('사진을 3장 이상 골라 주세요.')
    const up = await uploadImages(photoFiles, `products/${me.id}`)
    if ('error' in up) return fail(up.error)
    photoUrls = up.urls
  } else {
    photoUrls = raw.photoUrls.split('\n').map((s) => s.trim()).filter(Boolean)
    if (photoUrls.length < 3) return fail('사진을 3장 이상 넣어 주세요.')
  }

  let backerProofUrl: string
  if (isConfigured() && proofFile) {
    const up = await uploadImages([proofFile], `proofs/${me.id}`)
    if ('error' in up) return fail(up.error)
    backerProofUrl = up.urls[0]
  } else {
    backerProofUrl = raw.backerProofUrl.trim()
    if (!backerProofUrl) return fail('후원 인증 이미지가 없으면 등록할 수 없습니다.')
  }

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
      backerProofUrl,
      startPrice,
    })
  } catch {
    return fail('등록하지 못했습니다. 입력값을 확인해 주세요.')
  }

  redirect('/me?registered=1')
}

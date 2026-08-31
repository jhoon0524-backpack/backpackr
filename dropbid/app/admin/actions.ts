'use server'

import { approveProduct, rejectProduct } from '@/lib/db'

export type ReviewState = { message: string; tone: 'success' | 'error' } | null

export async function review(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const productId = String(formData.get('productId'))
  const decision = String(formData.get('decision'))

  try {
    if (decision === 'approve') {
      const dropId = String(formData.get('dropId'))
      if (!dropId) return { message: '배정할 회차를 골라 주세요.', tone: 'error' }
      await approveProduct(productId, dropId)
      return { message: '승인했습니다. 해당 회차에 배정되었습니다.', tone: 'success' }
    }

    await rejectProduct(productId, String(formData.get('reason') ?? ''))
    return { message: '반려했습니다. 사유가 판매자에게 전달됩니다.', tone: 'success' }
  } catch (e) {
    // DB 함수가 던진 사유를 그대로 보여준다 (마감된 회차, 사유 없는 반려 등).
    const detail = e instanceof Error ? e.message.replace(/^.*?:\s*/, '') : '처리하지 못했습니다.'
    return { message: detail, tone: 'error' }
  }
}

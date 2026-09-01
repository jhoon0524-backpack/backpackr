'use server'

import { approveProduct, rejectProduct, resolveStuckAuction } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { adminErrorMessage, FALLBACK } from '@/lib/admin-message'

export type ReviewState = { message: string; tone: 'success' | 'error' } | null

/** 문구 고르기는 `lib/admin-message.ts` 에 있다 (테스트 가능하게 분리). 여기서는 로그만 더한다. */
function toMessage(e: unknown, where: string): string {
  const message = adminErrorMessage(e)
  // 모르는 오류는 화면으로 내보내지 않았으니, 사람이 볼 곳은 서버 로그다.
  if (message === FALLBACK) console.error(`[${where}] 처리 실패:`, e)
  return message
}

export async function review(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const me = await getCurrentUser()
  if (!me?.is_operator) return { message: '운영자만 검수할 수 있습니다.', tone: 'error' }

  const productId = String(formData.get('productId'))
  const decision = String(formData.get('decision'))

  try {
    if (decision === 'approve') {
      const dropId = String(formData.get('dropId'))
      if (!dropId) return { message: '배정할 회차를 골라 주세요.', tone: 'error' }
      await approveProduct(productId, dropId, me.id)
      return { message: '승인했습니다. 해당 회차에 배정되었습니다.', tone: 'success' }
    }

    await rejectProduct(productId, String(formData.get('reason') ?? ''), me.id)
    return { message: '반려했습니다. 사유가 판매자에게 전달됩니다.', tone: 'success' }
  } catch (e) {
    return { message: toMessage(e, 'review'), tone: 'error' }
  }
}

/** 최고입찰자가 계정을 지워 스케줄러가 확정하지 못한 경매를 유찰로 마무리한다. */
export async function resolveStuck(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const me = await getCurrentUser()
  if (!me?.is_operator) return { message: '운영자만 처리할 수 있습니다.', tone: 'error' }

  try {
    await resolveStuckAuction(String(formData.get('auctionId')))
    return { message: '유찰로 마무리했습니다. 판매자에게 알림이 갑니다.', tone: 'success' }
  } catch (e) {
    return { message: toMessage(e, 'resolveStuck'), tone: 'error' }
  }
}

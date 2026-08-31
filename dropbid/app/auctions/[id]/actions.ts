'use server'

import { revalidatePath } from 'next/cache'
import { placeBid } from '@/lib/db'

/** 거부 사유 코드를 사람이 읽는 문구로. PRD 화면 상태 설계의 "거부 사유별 문구". */
const REJECT_MESSAGE: Record<string, string> = {
  not_live: '경매가 종료되었습니다.',
  seller_cannot_bid: '본인이 올린 상품에는 입찰할 수 없습니다.',
  already_highest: '이미 최고입찰자입니다.',
  amount_too_low: '입찰가가 최소 입찰가보다 낮습니다.',
  no_phone: '연락처를 먼저 등록해야 입찰할 수 있습니다.',
}

export type BidState = {
  message: string
  tone: 'success' | 'error'
} | null

export async function submitBid(_prev: BidState, formData: FormData): Promise<BidState> {
  const auctionId = String(formData.get('auctionId'))
  const userId = String(formData.get('userId'))
  const amount = Number(formData.get('amount'))

  if (!Number.isInteger(amount) || amount <= 0) {
    return { message: '입찰가를 숫자로 입력해 주세요.', tone: 'error' }
  }

  // 입찰은 place_bid 를 통해서만 한다. 여기서 bids/auctions 에 직접 쓰지 않는다.
  const result = await placeBid(auctionId, userId, amount)
  revalidatePath(`/auctions/${auctionId}`)

  if (result.outcome === 'accepted') {
    return {
      message: result.extended
        ? '입찰되었습니다. 마감 임박이라 마감이 30초 연장되었습니다.'
        : '입찰되었습니다.',
      tone: 'success',
    }
  }

  const reason = result.reject_reason ?? ''
  const detail =
    reason === 'amount_too_low'
      ? ` 최소 ${result.min_next_amount.toLocaleString('ko-KR')}원부터 가능합니다.`
      : ''
  return {
    message: (REJECT_MESSAGE[reason] ?? '입찰이 거부되었습니다.') + detail,
    tone: 'error',
  }
}

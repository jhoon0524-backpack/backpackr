'use server'

import { redirect } from 'next/navigation'
import { relistProduct } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export type RelistState = { message: string; tone: 'success' | 'error' } | null

/** 유찰·미결제로 끝난 상품을 같은 내용으로 다시 검수에 올린다. */
export async function relist(_prev: RelistState, formData: FormData): Promise<RelistState> {
  const me = await getCurrentUser()
  if (!me) return { message: '먼저 위쪽에서 사용자를 골라 주세요.', tone: 'error' }

  try {
    await relistProduct(String(formData.get('productId')), me.id)
  } catch (e) {
    // DB 함수가 던진 사유를 그대로 보여준다 (남의 상품, 이미 다시 올림 등).
    const detail = e instanceof Error ? e.message.replace(/^.*?:\s*/, '') : '처리하지 못했습니다.'
    return { message: detail, tone: 'error' }
  }

  // 성공하면 버튼이 사라진다(다시 올릴 수 없는 상태가 되므로). 메시지도 같이 사라지니
  // 등록 때와 같은 방식으로 마이페이지 배너에 남긴다.
  redirect('/me?relisted=1')
}

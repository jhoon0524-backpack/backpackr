'use server'

import { revalidatePath } from 'next/cache'
import { acceptRequest, cancelRequest, completeRequest, declineRequest, deliverRequest, getRequest } from '@/lib/db'
import { rejectMessage } from '@/lib/format'
import { getCurrentUser } from '@/lib/session'

export type ActionState = { message: string } | null

/**
 * 의뢰 상세의 버튼 다섯 개가 전부 이 하나로 온다. 무엇을 할지는 `kind` 로 정한다.
 * 권한(내 의뢰인지, 내 커미션인지)은 DB 함수가 최종 판정한다. 여기서는 그 결과를 문구로 바꿀 뿐이다.
 */
export async function actOnRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentUser()
  if (!me) return { message: '먼저 위쪽에서 사용자를 골라 주세요.' }

  const id = String(formData.get('id') ?? '')
  const kind = String(formData.get('kind') ?? '')
  const r = await getRequest(id)
  if (!r) return { message: '없는 의뢰입니다.' }

  try {
    let result
    switch (kind) {
      case 'accept': {
        const finalPrice = Number(formData.get('finalPrice'))
        if (!Number.isInteger(finalPrice) || finalPrice < 1000) return { message: '최종가는 1,000원 이상이어야 합니다.' }
        result = await acceptRequest(id, me.id, finalPrice)
        break
      }
      case 'decline':
        result = await declineRequest(id, me.id, String(formData.get('reason') ?? ''))
        break
      case 'cancel':
        result = await cancelRequest(id, me.id)
        break
      case 'deliver':
        result = await deliverRequest(
          id, me.id,
          String(formData.get('deliveryUrl') ?? '').trim() || null,
          String(formData.get('deliveryNote') ?? '').trim() || null,
        )
        break
      case 'complete':
        result = await completeRequest(id, me.id)
        break
      default:
        return { message: '알 수 없는 동작입니다.' }
    }
    if (result.outcome === 'rejected') return { message: rejectMessage(result.reject_reason) }
  } catch {
    // 남의 의뢰를 건드리면 DB 함수가 예외를 던진다. 화면 버튼은 본인에게만 보이지만 주소로 올 수 있다.
    return { message: '이 의뢰에 대해 할 수 있는 동작이 아닙니다.' }
  }

  revalidatePath(`/requests/${id}`)
  revalidatePath('/me')
  revalidatePath('/')
  revalidatePath(`/commissions/${r.commission_id}`)
  return null
}

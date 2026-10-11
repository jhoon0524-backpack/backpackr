'use server'

import { redirect } from 'next/navigation'
import { updateCommission } from '@/lib/db'
import { parseCommissionForm } from '@/lib/commission-input'
import { getCurrentUser } from '@/lib/session'
import type { CommissionFormState } from '@/app/open/actions'

export async function saveCommission(_prev: CommissionFormState, formData: FormData): Promise<CommissionFormState> {
  const id = String(formData.get('id') ?? '')
  const me = await getCurrentUser()
  const parsed = parseCommissionForm(formData)
  if (!me) return { message: '먼저 위쪽에서 사용자를 골라 주세요.', values: parsed.values }
  if (!parsed.ok) return { message: parsed.message, values: parsed.values, field: parsed.field }

  let result
  try {
    result = await updateCommission(id, me.id, parsed.value)
  } catch {
    return { message: '고치지 못했어요. 입력값을 확인해 주세요.', values: parsed.values }
  }

  if (!result.ok) {
    // 화면 버튼은 본인에게만 보이지만 주소로 들어올 수 있다. 이유를 갈라서 말해 준다.
    const message = result.reason === 'not_mine'
      ? '내가 붙인 메뉴가 아니에요.'
      : `지금 ${result.active}건이 진행 중이라 동시 진행 건수를 ${result.active}보다 작게 줄일 수 없어요. 진행 중인 작업이 끝나면 줄일 수 있어요.`
    // 자리 수 거부는 동시 진행 칸의 문제다. 그 칸 옆에 붙인다.
    return { message, values: parsed.values, field: result.reason === 'not_mine' ? undefined : 'maxSlots' }
  }

  redirect(`/commissions/${id}?updated=1`)
}

'use server'

import { redirect } from 'next/navigation'
import { createCommission } from '@/lib/db'
import { parseCommissionForm, type CommissionField, type CommissionValues } from '@/lib/commission-input'
import { getCurrentUser } from '@/lib/session'

/**
 * `field` 가 있으면 화면은 문구를 **그 칸 바로 아래**에 붙인다.
 * 어느 칸의 문제도 아닌 것(사용자 미선택, DB 실패)은 `field` 없이 폼 아래에 뜬다.
 */
export type CommissionFormState =
  | { message: string; values: CommissionValues; field?: CommissionField }
  | null

export async function openCommission(_prev: CommissionFormState, formData: FormData): Promise<CommissionFormState> {
  const me = await getCurrentUser()
  const parsed = parseCommissionForm(formData)
  if (!me) return { message: '먼저 위쪽에서 사용자를 골라 주세요.', values: parsed.values }
  if (!parsed.ok) return { message: parsed.message, values: parsed.values, field: parsed.field }

  try {
    await createCommission({ creatorId: me.id, ...parsed.value })
  } catch {
    return { message: '메뉴를 붙이지 못했어요. 입력값을 확인해 주세요.', values: parsed.values }
  }

  redirect('/me?opened=1')
}

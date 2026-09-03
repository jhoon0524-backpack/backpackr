'use server'

import { redirect } from 'next/navigation'
import { createCommission } from '@/lib/db'
import { parseCommissionForm, type CommissionValues } from '@/lib/commission-input'
import { getCurrentUser } from '@/lib/session'

export type CommissionFormState = { message: string; values: CommissionValues } | null

export async function openCommission(_prev: CommissionFormState, formData: FormData): Promise<CommissionFormState> {
  const me = await getCurrentUser()
  const parsed = parseCommissionForm(formData)
  if (!me) return { message: '먼저 위쪽에서 사용자를 골라 주세요.', values: parsed.values }
  if (!parsed.ok) return { message: parsed.message, values: parsed.values }

  try {
    await createCommission({ creatorId: me.id, ...parsed.value })
  } catch {
    return { message: '메뉴를 붙이지 못했어요. 입력값을 확인해 주세요.', values: parsed.values }
  }

  redirect('/me?opened=1')
}

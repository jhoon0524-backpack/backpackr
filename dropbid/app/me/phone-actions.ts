'use server'

import { redirect } from 'next/navigation'
import { updatePhone } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { normalizePhone } from '@/lib/phone'

export type PhoneState = { message: string; value: string } | null

export async function savePhone(_prev: PhoneState, formData: FormData): Promise<PhoneState> {
  const raw = String(formData.get('phone') ?? '')
  const fail = (message: string): PhoneState => ({ message, value: raw })

  const me = await getCurrentUser()
  if (!me) return fail('먼저 위쪽에서 사용자를 골라 주세요.')

  if (!raw.trim()) return fail('연락처를 입력해 주세요.')

  const phone = normalizePhone(raw)
  if (!phone) return fail('휴대폰 번호 형식이 아닙니다. 예: 010-1234-5678')

  try {
    await updatePhone(me.id, phone)
  } catch {
    return fail('저장하지 못했습니다. 번호를 확인해 주세요.')
  }

  redirect('/me?phone=saved')
}

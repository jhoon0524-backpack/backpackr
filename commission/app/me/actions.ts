'use server'

import { revalidatePath } from 'next/cache'
import { setCommissionStatus } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

/** 커미션 열기/닫기. 닫아도 진행 중인 의뢰는 그대로 간다 — 새 의뢰만 막는다. */
export async function toggleCommission(formData: FormData) {
  const me = await getCurrentUser()
  if (!me) return
  const id = String(formData.get('id') ?? '')
  const to = String(formData.get('to') ?? '') === 'closed' ? 'closed' : 'open'
  await setCommissionStatus(id, me.id, to)
  revalidatePath('/me')
  revalidatePath('/')
  revalidatePath(`/commissions/${id}`)
}

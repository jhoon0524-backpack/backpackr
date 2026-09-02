'use server'

import { redirect } from 'next/navigation'
import { submitRequest } from '@/lib/db'
import { rejectMessage } from '@/lib/format'
import { getCurrentUser } from '@/lib/session'

export type RequestState = { message: string; values: Record<string, string> } | null

export async function sendRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const raw = {
    commissionId: String(formData.get('commissionId') ?? ''),
    brief: String(formData.get('brief') ?? ''),
    referenceUrl: String(formData.get('referenceUrl') ?? ''),
  }
  // 실패해도 입력값은 남긴다.
  const fail = (message: string): RequestState => ({ message, values: raw })

  const me = await getCurrentUser()
  if (!me) return fail('먼저 위쪽에서 사용자를 골라 주세요.')
  if (raw.brief.trim().length < 10) return fail('의뢰 내용을 10자 이상 적어 주세요. 창작자가 판단할 수 있어야 합니다.')

  let result
  try {
    result = await submitRequest(raw.commissionId, me.id, raw.brief.trim(), raw.referenceUrl.trim() || null)
  } catch {
    return fail('의뢰를 넣지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }
  if (result.outcome === 'rejected') return fail(rejectMessage(result.reject_reason))

  redirect(`/requests/${result.request_id}?sent=1`)
}

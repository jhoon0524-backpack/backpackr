'use server'

import { redirect } from 'next/navigation'
import { CATEGORIES, createCommission } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'

export type OpenState = { message: string; values: Record<string, string> } | null

export async function openCommission(_prev: OpenState, formData: FormData): Promise<OpenState> {
  const raw = Object.fromEntries(
    ['title', 'description', 'category', 'price', 'turnaroundDays', 'maxSlots', 'sampleUrls']
      .map((k) => [k, String(formData.get(k) ?? '')]),
  )
  const fail = (message: string): OpenState => ({ message, values: raw })

  const me = await getCurrentUser()
  if (!me) return fail('먼저 위쪽에서 사용자를 골라 주세요.')

  const title = raw.title.trim()
  if (!title || title.length > 60) return fail('제목을 1~60자로 적어 주세요.')
  if (!raw.description.trim()) return fail('무엇을 어떻게 작업하는지 설명을 적어 주세요.')
  if (!(CATEGORIES as readonly string[]).includes(raw.category)) return fail('분류를 골라 주세요.')

  const price = Number(raw.price)
  if (!Number.isInteger(price) || price < 1000) return fail('기본 가격은 1,000원 이상이어야 합니다.')
  const turnaroundDays = Number(raw.turnaroundDays)
  if (!Number.isInteger(turnaroundDays) || turnaroundDays < 1 || turnaroundDays > 90) {
    return fail('작업 기간은 1~90일 사이여야 합니다.')
  }
  const maxSlots = Number(raw.maxSlots)
  if (!Number.isInteger(maxSlots) || maxSlots < 1 || maxSlots > 20) {
    return fail('동시 진행 건수는 1~20 사이여야 합니다.')
  }
  const sampleUrls = raw.sampleUrls.split('\n').map((s) => s.trim()).filter(Boolean)

  try {
    await createCommission({
      creatorId: me.id, title, description: raw.description.trim(), category: raw.category,
      price, turnaroundDays, maxSlots, sampleUrls,
    })
  } catch {
    return fail('커미션을 열지 못했습니다. 입력값을 확인해 주세요.')
  }

  redirect('/me?opened=1')
}

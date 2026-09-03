import { CATEGORIES } from './db'

/**
 * 메뉴 폼(붙이기·고치기)의 입력값을 읽고 검증한다.
 *
 * 붙이기와 고치기가 같은 필드를 쓰므로 검증도 한 곳에 둔다. 두 군데로 갈라 두면
 * 한쪽만 고쳐져서 "붙일 땐 막히는데 고칠 땐 통과하는" 값이 생긴다.
 * 실패해도 사용자가 친 값은 그대로 돌려준다 — 다시 타이핑하게 하지 않는다.
 */

const FIELDS = ['title', 'description', 'category', 'price', 'turnaroundDays', 'maxSlots', 'sampleUrls'] as const

export type CommissionValues = Record<string, string>

export type CommissionInput = {
  title: string
  description: string
  category: string
  price: number
  turnaroundDays: number
  maxSlots: number
  sampleUrls: string[]
}

export type ParsedCommission =
  | { ok: true; value: CommissionInput; values: CommissionValues }
  | { ok: false; message: string; values: CommissionValues }

export function parseCommissionForm(formData: FormData): ParsedCommission {
  const values: CommissionValues = Object.fromEntries(
    FIELDS.map((k) => [k, String(formData.get(k) ?? '')]),
  )
  const fail = (message: string): ParsedCommission => ({ ok: false, message, values })

  const title = values.title.trim()
  if (!title || title.length > 60) return fail('제목을 1~60자로 적어 주세요.')
  if (!values.description.trim()) return fail('무엇을 어떻게 작업하는지 설명을 적어 주세요.')
  if (!(CATEGORIES as readonly string[]).includes(values.category)) return fail('분류를 골라 주세요.')

  const price = Number(values.price)
  if (!Number.isInteger(price) || price < 1000) return fail('기본 가격은 1,000원 이상이어야 합니다.')
  const turnaroundDays = Number(values.turnaroundDays)
  if (!Number.isInteger(turnaroundDays) || turnaroundDays < 1 || turnaroundDays > 90) {
    return fail('작업 기간은 1~90일 사이여야 합니다.')
  }
  const maxSlots = Number(values.maxSlots)
  if (!Number.isInteger(maxSlots) || maxSlots < 1 || maxSlots > 20) {
    return fail('동시 진행 건수는 1~20 사이여야 합니다.')
  }

  return {
    ok: true,
    values,
    value: {
      title,
      description: values.description.trim(),
      category: values.category,
      price,
      turnaroundDays,
      maxSlots,
      sampleUrls: values.sampleUrls.split('\n').map((s) => s.trim()).filter(Boolean),
    },
  }
}

/** 고치기 화면의 첫 화면에 채워 넣을 값. 폼은 문자열만 다루므로 여기서 맞춘다. */
export function commissionToValues(c: {
  title: string
  description: string
  category: string
  price: number
  turnaround_days: number
  max_slots: number
  sample_urls: string[]
}): CommissionValues {
  return {
    title: c.title,
    description: c.description,
    category: c.category,
    price: String(c.price),
    turnaroundDays: String(c.turnaround_days),
    maxSlots: String(c.max_slots),
    sampleUrls: c.sample_urls.join('\n'),
  }
}

'use client'

import { useState } from 'react'
import { comma } from '@/lib/format'

/**
 * 금액 입력칸.
 *
 * `type="number"` 를 쓰면 두 가지가 걸린다.
 * 1. 자릿수 구분이 안 돼 55000 을 잘못 읽는다.
 * 2. `min`/`step` 에 걸리면 브라우저가 자기 언어로 막는다 — 한국어 서비스에
 *    "Please enter a valid value..." 가 뜨고, 1,000원 단위가 아니면 아예 못 넣는다 (실제로 겪었다).
 *
 * 그래서 보이는 칸은 자릿수를 넣은 글자로 두고, 실제로 보내는 값은 숨긴 칸에 숫자만 담는다.
 * 금액 규칙(최소 얼마)은 전부 서버가 판정한다. 그래야 문구가 한국어로 나온다.
 */
export function MoneyInput({
  name,
  defaultValue,
  className,
}: {
  name: string
  defaultValue: number | string
  className?: string
}) {
  const digitsOnly = (v: string) => v.replace(/[^0-9]/g, '')
  const [digits, setDigits] = useState(() => digitsOnly(String(defaultValue ?? '')))

  return (
    <span className="relative block">
      <input type="hidden" name={name} value={digits} />
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label="금액"
        value={digits === '' ? '' : comma(Number(digits))}
        onChange={(e) => setDigits(digitsOnly(e.target.value))}
        className={className}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
        원
      </span>
    </span>
  )
}

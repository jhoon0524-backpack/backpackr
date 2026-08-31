'use client'

import { useEffect, useState } from 'react'

/** 남은 시간. 서버와 클라이언트가 다른 시각을 그리지 않도록 마운트 후에만 센다. */
export function Countdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setLeft(new Date(endsAt).getTime() - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (left === null) return <span className="tabular-nums text-zinc-400">--:--:--</span>
  if (left <= 0) return <span className="tabular-nums text-zinc-500">마감</span>

  const s = Math.floor(left / 1000)
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
  const urgent = left < 60_000
  return (
    <span className={`tabular-nums ${urgent ? 'font-semibold text-red-600' : ''}`}>
      {parts.map((n) => String(n).padStart(2, '0')).join(':')}
    </span>
  )
}

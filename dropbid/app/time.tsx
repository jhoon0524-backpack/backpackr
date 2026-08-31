'use client'

import { useEffect, useState } from 'react'

/**
 * 남은 시간.
 *
 * 브라우저 시계를 그대로 믿으면 안 된다. 사용자 시계가 2분 느리면 이미 마감된 경매를
 * "2분 남음" 으로 보고 입찰하려다 서버에서 거부당한다. 30초 연장이 걸린 경매에서는 치명적이다.
 * 서버가 그린 시각을 함께 받아 보정값을 구하고, 그 뒤로는 서버 기준으로 센다.
 *
 * 마운트 전에는 자리만 잡는다. 서버와 브라우저가 다른 문구를 그리면 히드레이션이 깨진다.
 */
export function Countdown({ endsAt, serverNow }: { endsAt: string; serverNow: string }) {
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    // 서버가 그린 시각과 마운트 시각의 차이. 전송·렌더 시간만큼 오차가 있으나
    // 시계가 틀어진 폭(분 단위)에 비하면 무시할 수준이다.
    const skew = new Date(serverNow).getTime() - Date.now()
    const tick = () => setLeft(new Date(endsAt).getTime() - (Date.now() + skew))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt, serverNow])

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

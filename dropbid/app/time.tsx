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
export function Countdown({
  endsAt,
  serverNow,
  format = 'clock',
}: {
  endsAt: string
  serverNow: string
  /**
   * 'clock' — 01:59:47. 마감이 몇 시간 안 남은 경매용.
   * 'long'  — 23시간 45분 남음. 결제 기한처럼 하루 단위인 것용.
   *           하루짜리를 시계꼴로 쓰면 "23:45:12" 가 시각으로 읽힌다.
   */
  format?: 'clock' | 'long'
}) {
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

  if (left === null) {
    return <span className="tabular-nums text-zinc-400">{format === 'long' ? '…' : '--:--:--'}</span>
  }
  if (left <= 0) {
    return <span className="tabular-nums text-zinc-500">{format === 'long' ? '기한 지남' : '마감'}</span>
  }

  const s = Math.floor(left / 1000)
  const [h, m, sec] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
  const urgent = format === 'long' ? left < 3600_000 : left < 60_000
  const text =
    format === 'long'
      ? h >= 1
        ? `${h}시간 ${m}분 남음`
        : `${m}분 남음`
      : [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':')

  return (
    <span className={`tabular-nums ${urgent ? 'font-semibold text-red-600' : ''}`}>{text}</span>
  )
}

import { useEffect, useState } from 'react'
import { Text, TextStyle } from 'react-native'
import { C } from './theme'
import { remain } from './format'

/**
 * 남은 시간.
 *
 * 기기 시계를 그대로 믿으면 안 된다. 2분 느린 시계를 쓰는 사람은 이미 마감된
 * 경매를 "2분 남음" 으로 보고 입찰하려다 거부당한다 (웹과 같은 이유).
 * 서버가 준 시각으로 보정값을 구하고 그 뒤로는 서버 기준으로 센다.
 */
export function Countdown({
  endsAt,
  serverNow,
  style,
}: {
  endsAt: string
  serverNow: string
  style?: TextStyle
}) {
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now())
  const [now, setNow] = useState(() => remain(endsAt, skew))

  useEffect(() => {
    const id = setInterval(() => setNow(remain(endsAt, skew)), 1000)
    return () => clearInterval(id)
  }, [endsAt, skew])

  return (
    <Text
      style={[
        { fontVariant: ['tabular-nums'], color: now.urgent ? C.urgent : C.ink },
        now.urgent && { fontWeight: '700' },
        style,
      ]}
    >
      {now.text}
    </Text>
  )
}

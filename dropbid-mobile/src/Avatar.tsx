import { Text, View } from 'react-native'

/** 판매자 아바타. `profiles` 에 사진 칸이 없어 이름 첫 글자로 만든다 (웹과 같다). */
const TONES = [
  ['#ffedd5', '#7c2d12'], ['#d1fae5', '#064e3b'], ['#e0f2fe', '#0c4a6e'],
  ['#ede9fe', '#4c1d95'], ['#ffe4e6', '#881337'], ['#fef3c7', '#78350f'],
]

export function Avatar({ name, size = 20 }: { name: string | null; size?: number }) {
  const label = name?.trim() ?? ''
  const initial = label ? [...label][0].toUpperCase() : '?'
  let hash = 0
  for (const ch of label) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) % 997
  const [bg, fg] = TONES[hash % TONES.length]
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.5, fontWeight: '700', color: fg }}>{initial}</Text>
    </View>
  )
}

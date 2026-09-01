import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native'
import { C, cardShadow } from './theme'
import { CONDITION, kst, maskNickname, won } from './format'
import { Countdown } from './Countdown'
import { fetchAuction, type AuctionDetail as Detail } from './api'

export function AuctionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<{ serverNow: string; auction: Detail } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAuction(id).then(setD).catch((e) => setError((e as Error).message))
  }, [id])

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>{error}</Text>
        <Text style={{ marginTop: 6, fontSize: 13, color: C.muted, textAlign: 'center' }}>
          마감되어 내려간 경매일 수 있습니다.
        </Text>
        <Pressable onPress={onBack} style={{ marginTop: 16, minHeight: 44, justifyContent: 'center',
          paddingHorizontal: 20, borderRadius: 8, backgroundColor: C.ash }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>드롭 목록으로</Text>
        </Pressable>
      </View>
    )
  }
  if (!d) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.muted} /></View>
  }

  const a = d.auction
  const live = a.status === 'live'

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Pressable onPress={onBack} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ fontSize: 14, color: C.muted }}>← 드롭 목록</Text>
      </Pressable>

      <Text style={{ marginTop: 4, fontSize: 20, fontWeight: '700', color: C.ink, lineHeight: 28 }}>
        {a.title}
      </Text>
      <Text style={{ marginTop: 6, fontSize: 13, color: C.muted, lineHeight: 19 }}>
        {a.funding_project_name} · {CONDITION[a.condition_grade] ?? a.condition_grade}
        {a.seller_nickname ? ` · 판매자 ${a.seller_nickname}` : ''}
      </Text>

      {a.photo_urls?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
          {a.photo_urls.map((u, i) => (
            <Image key={`${u}-${i}`} source={{ uri: u }}
              style={{ width: 200, height: 200, borderRadius: 10, backgroundColor: C.fill }} />
          ))}
        </ScrollView>
      )}

      <View style={[{ backgroundColor: C.card, borderRadius: 10, padding: 16, marginTop: 8 }, cardShadow]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ fontSize: 11, color: C.muted }}>
              {a.bid_count === 0 ? '시작가' : live ? '현재가' : '낙찰가'}
            </Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: C.ink,
                           fontVariant: ['tabular-nums'] }}>
              {won(a.current_price)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 11, color: C.muted }}>남은 시간</Text>
            <Countdown endsAt={a.ends_at} serverNow={d.serverNow} style={{ fontSize: 17 }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 16, marginTop: 16, paddingTop: 14,
                       borderTopWidth: 1, borderTopColor: C.line }}>
          <Field label="입찰" value={`${a.bid_count}회 · ${a.bidder_count}명`} />
          <Field
            label={a.bid_count === 0 || live ? '최고입찰자' : '낙찰자'}
            value={maskNickname(a.highest_bidder_nickname) ?? (live ? '아직 없음' : '입찰 없음')}
          />
          {live && <Field label="마감 연장" value={`${a.extension_count}회 / 20회`} />}
        </View>

        {live && (
          <Text style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line,
                         fontSize: 11, color: C.muted, lineHeight: 16 }}>
            마감 직전에 입찰이 들어오면 마감이 조금씩 미뤄집니다 (최대 20회).
          </Text>
        )}
      </View>

      {live ? (
        /*
          입찰은 로그인이 붙은 뒤에 연다. `place_bid` 는 anon 에게서 실행 권한이
          회수돼 있고, 지금은 누가 부르는지 서버가 알 방법이 없다.
          버튼만 먼저 두고 누를 수 있게 하면 "되는 줄 알았다" 가 된다. 상태를 밝힌다.
        */
        <View style={[{ backgroundColor: C.card, borderRadius: 10, padding: 16, marginTop: 12 },
                      cardShadow]}>
          <Text style={{ fontSize: 12, color: C.muted }}>최소 입찰가</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.ink,
                         fontVariant: ['tabular-nums'], marginTop: 2 }}>
            {won(a.min_next_amount)}
          </Text>
          <View style={{ marginTop: 12, borderRadius: 8, backgroundColor: C.fill,
                         paddingHorizontal: 14, paddingVertical: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.strong }}>
              앱에서 입찰은 로그인이 붙은 뒤 열립니다
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: C.muted, lineHeight: 17 }}>
              입찰은 취소할 수 없고 낙찰되면 결제 의무가 생깁니다. 누가 입찰하는지
              서버가 확인할 수 있어야 열 수 있습니다. 지금은 웹에서 입찰해 주세요.
            </Text>
          </View>
        </View>
      ) : (
        <Result a={a} serverNow={d.serverNow} />
      )}
    </ScrollView>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: C.muted }}>{label}</Text>
      <Text style={{ marginTop: 2, fontSize: 13, color: C.ink }}>{value}</Text>
    </View>
  )
}

function Result({ a, serverNow }: { a: Detail; serverNow: string }) {
  if (a.status === 'unsold') return <Note title="유찰" body="입찰 없이 마감되었습니다." />
  if (a.status === 'payment_failed')
    return <Note title="결제 기한 초과" body="기한 안에 결제가 이루어지지 않아 거래가 종료되었습니다." />
  if (a.status !== 'sold') return <Note title="대기" body="아직 시작되지 않은 경매입니다." />

  return (
    <View style={[{ backgroundColor: C.card, borderRadius: 10, padding: 20, marginTop: 12 }, cardShadow]}>
      <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '700', color: C.good }}>낙찰</Text>
      <Text style={{ textAlign: 'center', fontSize: 26, fontWeight: '700', color: C.ink,
                     marginTop: 4, fontVariant: ['tabular-nums'] }}>
        {won(a.current_price)}
      </Text>
      <Text style={{ textAlign: 'center', fontSize: 13, color: C.muted, marginTop: 4 }}>
        {maskNickname(a.winner_nickname) ?? '알 수 없음'} 님에게 낙찰되었습니다.
      </Text>
      {a.order_due_at && a.order_status === 'pending' && (
        /* 결제 기한이 낙찰 금액보다 작으면 안 된다. 놓치면 거래가 날아가는 쪽이다. */
        <View style={{ marginTop: 14, borderRadius: 8, borderWidth: 1, borderColor: C.urgentLine,
                       backgroundColor: C.urgentWash, padding: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: C.strong }}>결제 기한</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.urgent, marginTop: 2 }}>
            {kst(a.order_due_at)}까지
          </Text>
          <Text style={{ marginTop: 6, fontSize: 11, color: C.strong, textAlign: 'center' }}>
            기한이 지나면 낙찰이 취소되고 상품은 다시 판매됩니다.
          </Text>
        </View>
      )}
    </View>
  )
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <View style={[{ backgroundColor: C.card, borderRadius: 10, padding: 24, marginTop: 12,
                    alignItems: 'center' }, cardShadow]}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: C.strong }}>{title}</Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: C.muted, textAlign: 'center' }}>{body}</Text>
    </View>
  )
}

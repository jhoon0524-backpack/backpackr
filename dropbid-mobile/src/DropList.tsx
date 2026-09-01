import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, FlatList, Image, Pressable, RefreshControl, Text, View,
} from 'react-native'
import { C, cardShadow } from './theme'
import { CONDITION, won } from './format'
import { Countdown } from './Countdown'
import { Avatar } from './Avatar'
import { fetchDrop, type LiveAuction } from './api'

/**
 * 이번 회차 목록.
 *
 * 웹의 홈과 같은 구조다 — 판매자를 카드 위로, 사진을 먼저 크게, 2열,
 * 회차 마감은 목록 위에 한 번만 (카드마다 같은 숫자가 반복되면 안 된다).
 */
export function DropList({ onOpen }: { onOpen: (id: string) => void }) {
  const [state, setState] = useState<{
    loading: boolean
    error: string | null
    serverNow: string
    auctions: LiveAuction[]
  }>({ loading: true, error: null, serverNow: new Date().toISOString(), auctions: [] })
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await fetchDrop()
      setState({ loading: false, error: null, serverNow: d.serverNow, auctions: d.auctions })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }))
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (state.loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.muted} />
      </View>
    )
  }

  // 실패해도 막다른 길로 두지 않는다. 다시 시도할 길을 준다.
  if (state.error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: C.ink, fontSize: 15, fontWeight: '600' }}>{state.error}</Text>
        <Text style={{ color: C.muted, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
          연결을 확인하고 다시 시도해 주세요.
        </Text>
        <Pressable
          onPress={() => { setState((s) => ({ ...s, loading: true, error: null })); void load() }}
          style={{ marginTop: 16, minHeight: 44, justifyContent: 'center',
                   paddingHorizontal: 20, borderRadius: 8, backgroundColor: C.ash }}
        >
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>다시 시도</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <FlatList
      data={state.auctions}
      keyExtractor={(a) => a.id}
      numColumns={2}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      /*
        2열에서 개수가 홀수면 마지막 카드가 flex:1 로 한 줄을 다 먹는다
        (RN FlatList 의 알려진 동작). 빈 칸을 채워 봤더니 gap 과 겹쳐 마지막 줄만
        12px 넓어졌다 (173/173/185). 폭을 직접 주고 space-between 으로 벌린다.
      */
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={C.muted}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />
      }
      ListHeaderComponent={
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.ink }}>이번 드롭</Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: C.muted, lineHeight: 19 }}>
            마감 임박순입니다. 회차에 속한 경매는 같은 시각에 함께 마감합니다.
          </Text>
          {state.auctions.length > 0 && (
            <View style={[{ marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row',
                            alignItems: 'baseline', gap: 8, backgroundColor: C.card,
                            borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }, cardShadow]}>
              <Text style={{ fontSize: 13, color: C.muted }}>이번 회차 마감까지</Text>
              <Countdown endsAt={state.auctions[0].ends_at} serverNow={state.serverNow}
                style={{ fontSize: 15, fontWeight: '700' }} />
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={[{ backgroundColor: C.card, borderRadius: 10, padding: 32,
                        alignItems: 'center' }, cardShadow]}>
          <Text style={{ color: C.strong, fontSize: 14 }}>지금 진행 중인 경매가 없습니다.</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            다음 드롭이 열리면 알려드릴게요.
          </Text>
        </View>
      }
      renderItem={({ item: a }) => (
        <Pressable
          onPress={() => onOpen(a.id)}
          style={({ pressed }) => [
            { width: '48.5%', backgroundColor: C.card, borderRadius: 10, padding: 12,
              opacity: pressed ? 0.85 : 1 },
            cardShadow,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Avatar name={a.seller_nickname} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontWeight: '500', color: C.strong }}>
              {a.seller_nickname ?? '알 수 없음'}
            </Text>
          </View>

          <View style={{ borderRadius: 6, overflow: 'hidden', backgroundColor: C.fill }}>
            {a.cover_url ? (
              <Image source={{ uri: a.cover_url }} style={{ width: '100%', aspectRatio: 1 }} />
            ) : (
              <View style={{ width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, color: C.strong }}>사진 없음</Text>
              </View>
            )}
            {a.bidder_count >= 2 && (
              /* 흰 글자를 얹으므로 navy(6.8). 브랜드 peach 는 3.75 라 여기 못 쓴다. */
              <View style={{ position: 'absolute', left: 6, bottom: 6, backgroundColor: C.good,
                             borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                  경쟁 {a.bidder_count}명
                </Text>
              </View>
            )}
          </View>

          <Text numberOfLines={2} style={{ marginTop: 8, fontSize: 13, fontWeight: '600',
                                            color: C.ink, lineHeight: 18 }}>
            {a.title}
          </Text>
          <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 11, color: C.muted }}>
            {CONDITION[a.condition_grade] ?? `상태 ${a.condition_grade}`}
          </Text>

          {/* 금액이 주인공이다. 라벨은 작게 위로, 입찰 수는 금액 옆으로. */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: C.muted }}>
              {a.bid_count === 0 ? '시작가' : '현재가'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink,
                             fontVariant: ['tabular-nums'] }}>
                {won(a.current_price)}
              </Text>
              {a.bid_count > 0 && (
                <Text style={{ fontSize: 11, color: C.muted }}>입찰 {a.bid_count}</Text>
              )}
            </View>
          </View>
        </Pressable>
      )}
    />
  )
}

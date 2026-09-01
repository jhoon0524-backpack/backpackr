import { useState } from 'react'
import { SafeAreaView, StatusBar, Text, View } from 'react-native'
import { C } from './src/theme'
import { DropList } from './src/DropList'
import { AuctionDetail } from './src/AuctionDetail'

/**
 * 화면 두 개뿐이라 라우터를 넣지 않았다. 화면이 늘면 그때 넣는다.
 * (지금 넣으면 쓰지도 않는 구조를 먼저 지고 가는 셈이다.)
 */
export default function App() {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />
      <View style={{ backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 12,
                     borderBottomWidth: 1, borderBottomColor: C.line }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.ink }}>
          Drop<Text style={{ color: C.urgent }}>bid</Text>
        </Text>
      </View>
      {openId
        ? <AuctionDetail id={openId} onBack={() => setOpenId(null)} />
        : <DropList onOpen={setOpenId} />}
    </SafeAreaView>
  )
}

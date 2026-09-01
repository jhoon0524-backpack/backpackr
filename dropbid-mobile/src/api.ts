/**
 * 서버로 가는 길.
 *
 * 앱이 Supabase 에 직접 붙지 않는다. 두 가지 때문이다 —
 * 1. `place_bid` 같은 쓰기 함수는 anon·authenticated 에게서 실행 권한이
 *    회수돼 있다 (`lock_write_paths` 마이그레이션). 휴대폰이 직접 못 부른다
 * 2. 목록에 필요한 판매자 이름(`profiles`)은 로그인한 사람만 볼 수 있다 (RLS)
 * 길을 둘로 나누면 규칙도 두 벌이 된다.
 */
import { Platform } from 'react-native'

/**
 * 개발 중에는 같은 기계의 Next 서버를 본다.
 * 안드로이드 에뮬레이터에서 10.0.2.2 는 호스트의 127.0.0.1 이다.
 */
const DEV_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:3100' : 'http://127.0.0.1:3100'
const PROD = 'https://dropbid-khan-9759s-projects.vercel.app'

export const BASE = process.env.EXPO_PUBLIC_API_BASE ?? (__DEV__ ? DEV_HOST : PROD)

export type LiveAuction = {
  id: string
  title: string
  funding_project_name: string
  condition_grade: string
  current_price: number
  ends_at: string
  bid_count: number
  bidder_count: number
  cover_url: string | null
  seller_nickname: string | null
}

export type AuctionDetail = LiveAuction & {
  status: string
  photo_urls: string[]
  funding_project_url: string | null
  seller_nickname: string | null
  highest_bidder_nickname: string | null
  winner_nickname: string | null
  extension_count: number
  min_next_amount: number
  order_status: string | null
  order_due_at: string | null
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) {
    // 화면에는 사람이 읽을 문구만 내보낸다. 서버 원문을 그대로 흘리지 않는다.
    throw new Error(res.status === 404 ? '찾을 수 없습니다.' : '불러오지 못했습니다.')
  }
  return res.json() as Promise<T>
}

export const fetchDrop = () =>
  get<{ serverNow: string; auctions: LiveAuction[]; past: unknown[] }>('/api/auctions')

export const fetchAuction = (id: string) =>
  get<{ serverNow: string; auction: AuctionDetail }>(`/api/auctions/${id}`)

/**
 * 서버로 가는 길.
 *
 * 앱이 Supabase 에 직접 붙지 않는다. 두 가지 때문이다 —
 * 1. `place_bid` 같은 쓰기 함수는 anon·authenticated 에게서 실행 권한이
 *    회수돼 있다 (`lock_write_paths` 마이그레이션). 휴대폰이 직접 못 부른다
 * 2. 목록에 필요한 판매자 이름(`profiles`)은 로그인한 사람만 볼 수 있다 (RLS)
 * 길을 둘로 나누면 규칙도 두 벌이 된다.
 */
/**
 * 기본은 **인터넷에 올라간 서버**다.
 *
 * 처음에는 개발 중이면 같은 기계의 Next 서버(127.0.0.1 / 안드로이드 에뮬레이터는
 * 10.0.2.2)를 보게 해 뒀는데, 그건 **에뮬레이터에만 맞는 이야기**였다.
 * 실제 휴대폰에서 127.0.0.1 은 그 휴대폰 자신이고 10.0.2.2 는 아무 데도 아니다.
 * Expo Go 로 실기기에서 열면 아무것도 못 불러온다 (실제로 겪었다).
 *
 * 그래서 기본을 배포본으로 둔다. 휴대폰이 인터넷만 되면 켜자마자 보인다.
 * 내 컴퓨터의 서버를 보게 하려면 앱을 띄우기 전에 —
 *   EXPO_PUBLIC_API_BASE=http://<내 컴퓨터 IP>:3100 npm start
 * 휴대폰에서는 localhost 가 아니라 **컴퓨터의 실제 IP** 를 적어야 한다.
 */
const PROD = 'https://dropbid-khan-9759s-projects.vercel.app'

export const BASE = process.env.EXPO_PUBLIC_API_BASE ?? PROD

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
  let res: Response
  try {
    res = await fetch(BASE + path)
  } catch {
    /*
      연결 자체가 안 될 때다 (전파가 끊겼거나, 서버가 쉬는 중).
      이걸 안 잡으면 브라우저·RN 이 던지는 "Failed to fetch" 가 한국어 화면에
      영어로 그대로 뜬다. 회귀 목록 1번("한국어 화면에 영어가 새어 나오지 않는다")
      위반이다. 실제로 그렇게 떴다.
    */
    throw new Error('인터넷에 연결되어 있는지 확인해 주세요.')
  }
  if (!res.ok) {
    // 화면에는 사람이 읽을 문구만 내보낸다. 서버 원문을 그대로 흘리지 않는다.
    throw new Error(res.status === 404 ? '찾을 수 없습니다.' : '불러오지 못했습니다.')
  }
  try {
    return (await res.json()) as T
  } catch {
    throw new Error('불러오지 못했습니다.')
  }
}

export const fetchDrop = () =>
  get<{ serverNow: string; auctions: LiveAuction[]; past: unknown[] }>('/api/auctions')

export const fetchAuction = (id: string) =>
  get<{ serverNow: string; auction: AuctionDetail }>(`/api/auctions/${id}`)

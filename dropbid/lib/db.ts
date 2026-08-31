import { Pool } from 'pg'

// 서버에서만 쓴다. 브라우저 번들에 들어가면 안 된다.
// 입찰은 place_bid 를 통해서만 한다 — 이 풀로 bids/auctions 에 직접 쓰지 않는다 (CLAUDE.md 규칙 목록).
declare global {
  var dropbidPool: Pool | undefined
}

export const pool =
  global.dropbidPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ?? 'postgresql://dropbid:dropbid@127.0.0.1:5432/dropbid_dev',
  })

// 개발 중 핫 리로드마다 풀이 새로 생기는 것을 막는다.
if (process.env.NODE_ENV !== 'production') global.dropbidPool = pool

export type LiveAuction = {
  id: string
  title: string
  funding_project_name: string
  category: string
  condition_grade: string
  current_price: number
  ends_at: Date
  bid_count: number
  bidder_count: number
}

/** 이번 회차 경매를 마감 임박순으로. */
export async function listLiveAuctions(): Promise<LiveAuction[]> {
  const { rows } = await pool.query<LiveAuction>(`
    select a.id, p.title, p.funding_project_name, p.category, p.condition_grade,
           a.current_price, a.ends_at,
           (select count(*) from bids b
             where b.auction_id = a.id and b.outcome = 'accepted')::int as bid_count,
           (select count(distinct b.bidder_id) from bids b
             where b.auction_id = a.id and b.outcome = 'accepted')::int as bidder_count
      from auctions a
      join products p on p.id = a.product_id
     where a.status = 'live'
     order by a.ends_at asc
  `)
  return rows
}

export type AuctionDetail = LiveAuction & {
  status: string
  min_next_amount: number
  extension_count: number
  seller_nickname: string | null
  highest_bidder_nickname: string | null
}

export async function getAuction(id: string): Promise<AuctionDetail | null> {
  const { rows } = await pool.query<AuctionDetail>(
    `select a.id, p.title, p.funding_project_name, p.category, p.condition_grade,
            a.current_price, a.ends_at, a.status, a.extension_count,
            seller.nickname as seller_nickname,
            top.nickname as highest_bidder_nickname,
            (select count(*) from bids b
              where b.auction_id = a.id and b.outcome = 'accepted')::int as bid_count,
            (select count(distinct b.bidder_id) from bids b
              where b.auction_id = a.id and b.outcome = 'accepted')::int as bidder_count,
            case when exists (select 1 from bids b
                               where b.auction_id = a.id and b.outcome = 'accepted')
                 then a.current_price + bid_increment(a.current_price)
                 else a.current_price
            end as min_next_amount
       from auctions a
       join products p on p.id = a.product_id
       join profiles seller on seller.id = p.seller_id
       left join profiles top on top.id = a.highest_bidder_id
      where a.id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export type BidResult = {
  outcome: 'accepted' | 'rejected'
  reject_reason: string | null
  current_price: number
  min_next_amount: number
  extended: boolean
}

/** 입찰의 유일한 통로. */
export async function placeBid(auctionId: string, userId: string, amount: number) {
  const { rows } = await pool.query<{ result: BidResult }>(
    `with r as (select place_bid($1, $2, $3) as j) select j as result from r`,
    [auctionId, userId, amount],
  )
  return rows[0].result
}

export async function listDemoUsers() {
  const { rows } = await pool.query<{ id: string; nickname: string }>(
    `select id, nickname from profiles order by nickname`,
  )
  return rows
}

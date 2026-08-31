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

export type PastResult = {
  id: string
  title: string
  status: string
  final_price: number
  bid_count: number
  winner_nickname: string | null
  round_number: number
  ends_at: Date
}

/**
 * 가장 최근에 마감된 회차의 결과.
 * 드롭이 끝나면 홈이 통째로 비어 방금 끝난 경매를 볼 곳이 없었다 (QA 에서 확인).
 */
export async function listLastDropResults(): Promise<PastResult[]> {
  // 회차 행의 마감 시각이 아니라 실제로 마감된 경매를 기준으로 잡는다.
  // 연장이 붙거나 운영자가 손대면 둘이 어긋난다 (처음에 회차 기준으로 짰다가 아무것도 안 나왔다).
  const { rows } = await pool.query<PastResult>(`
    with last_drop as (
      select a.drop_id, max(a.ends_at) as closed_at
        from auctions a
       where a.status in ('sold', 'unsold', 'payment_failed')
       group by a.drop_id
       order by max(a.ends_at) desc
       limit 1
    )
    select a.id, p.title, a.status, a.current_price as final_price,
           d.round_number, ld.closed_at as ends_at,
           w.nickname as winner_nickname,
           (select count(*) from bids b
             where b.auction_id = a.id and b.outcome = 'accepted')::int as bid_count
      from last_drop ld
      join drops d on d.id = ld.drop_id
      join auctions a on a.drop_id = ld.drop_id
      join products p on p.id = a.product_id
      left join profiles w on w.id = a.winner_id
     where a.status in ('sold', 'unsold', 'payment_failed')
     order by a.status, a.current_price desc
  `)
  return rows
}

export type AuctionDetail = LiveAuction & {
  status: string
  funding_project_url: string | null
  min_next_amount: number
  extension_count: number
  seller_nickname: string | null
  highest_bidder_nickname: string | null
  winner_id: string | null
  winner_nickname: string | null
  order_status: string | null
  order_due_at: Date | null
}

export async function getAuction(id: string): Promise<AuctionDetail | null> {
  const { rows } = await pool.query<AuctionDetail>(
    `select a.id, p.title, p.funding_project_name, p.funding_project_url,
            p.category, p.condition_grade,
            a.current_price, a.ends_at, a.status, a.extension_count,
            seller.nickname as seller_nickname,
            top.nickname as highest_bidder_nickname,
            a.winner_id, winner.nickname as winner_nickname,
            o.status as order_status, o.due_at as order_due_at,
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
       left join profiles winner on winner.id = a.winner_id
       left join orders o on o.auction_id = a.id
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

// ── 마이페이지 ────────────────────────────────────────────────

export type MyBidRow = {
  auction_id: string
  title: string
  my_amount: number
  current_price: number
  status: string
  ends_at: Date
  is_winning: boolean
}

/** 내가 입찰한 경매. 경매당 내 최고액만. */
export async function listMyBids(userId: string) {
  const { rows } = await pool.query<MyBidRow>(
    `select a.id as auction_id, p.title, max(b.amount) as my_amount,
            a.current_price, a.status, a.ends_at,
            (a.highest_bidder_id = $1) as is_winning
       from bids b
       join auctions a on a.id = b.auction_id
       join products p on p.id = a.product_id
      where b.bidder_id = $1 and b.outcome = 'accepted'
      group by a.id, p.title, a.current_price, a.status, a.ends_at, a.highest_bidder_id
      order by a.ends_at desc`,
    [userId],
  )
  return rows
}

export type MyWinRow = {
  auction_id: string
  title: string
  amount: number
  order_status: string
  due_at: Date
}

/** 내가 낙찰받은 것. 결제 기한이 붙어 있다. */
export async function listMyWins(userId: string) {
  const { rows } = await pool.query<MyWinRow>(
    `select a.id as auction_id, p.title, o.amount, o.status as order_status, o.due_at
       from orders o
       join auctions a on a.id = o.auction_id
       join products p on p.id = a.product_id
      where o.buyer_id = $1
      order by o.created_at desc`,
    [userId],
  )
  return rows
}

export type MySaleRow = {
  product_id: string
  title: string
  product_status: string
  rejection_reason: string | null
  auction_status: string | null
  current_price: number | null
  can_relist: boolean
}

/** 내가 올린 것. 검수 대기·반려까지 포함한다. */
export async function listMySales(userId: string) {
  const { rows } = await pool.query<MySaleRow>(
    `select p.id as product_id, p.title, p.status as product_status, p.rejection_reason,
            a.status as auction_status, a.current_price,
            (a.status in ('unsold', 'payment_failed')
             and not exists (select 1 from products r where r.relisted_from = p.id)
            ) as can_relist
       from products p
       left join auctions a on a.product_id = p.id
      where p.seller_id = $1
      order by p.created_at desc`,
    [userId],
  )
  return rows
}

// ── 운영자 검수 ────────────────────────────────────────────────

export type PendingProduct = {
  id: string
  title: string
  funding_project_name: string
  category: string
  condition_grade: string
  start_price: number
  backer_proof_url: string
  photo_urls: string[]
  seller_nickname: string | null
  created_at: Date
}

export async function listPendingProducts() {
  const { rows } = await pool.query<PendingProduct>(
    `select p.id, p.title, p.funding_project_name, p.category, p.condition_grade,
            p.start_price, p.backer_proof_url, p.photo_urls,
            s.nickname as seller_nickname, p.created_at
       from products p join profiles s on s.id = p.seller_id
      where p.status = 'pending'
      order by p.created_at`,
  )
  return rows
}

export type OpenDrop = { id: string; round_number: number; starts_at: Date; ends_at: Date }

/** 아직 마감되지 않은 회차만. 마감된 회차에는 배정할 수 없다. */
export async function listOpenDrops() {
  const { rows } = await pool.query<OpenDrop>(
    `select id, round_number, starts_at, ends_at from drops
      where ends_at > now() order by starts_at`,
  )
  return rows
}

/** 검수 승인·반려는 DB 함수를 통한다. 운영자 id 를 넘겨 DB 에서도 한 번 더 막는다. */
export async function approveProduct(productId: string, dropId: string, operatorId: string) {
  await pool.query(`select approve_product($1, $2, $3)`, [productId, dropId, operatorId])
}

export async function rejectProduct(productId: string, reason: string, operatorId: string) {
  await pool.query(`select reject_product($1, $2, $3)`, [productId, reason, operatorId])
}

// ── 상품 등록 ──────────────────────────────────────────────────

export type NewProduct = {
  sellerId: string
  title: string
  fundingProjectName: string
  fundingProjectUrl: string | null
  category: string
  conditionGrade: string
  photoUrls: string[]
  backerProofUrl: string
  startPrice: number
}

export async function createProduct(p: NewProduct) {
  const { rows } = await pool.query<{ id: string }>(
    `insert into products (seller_id, title, funding_project_name, funding_project_url,
                           category, condition_grade, photo_urls, backer_proof_url, start_price)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [
      p.sellerId,
      p.title,
      p.fundingProjectName,
      p.fundingProjectUrl,
      p.category,
      p.conditionGrade,
      p.photoUrls,
      p.backerProofUrl,
      p.startPrice,
    ],
  )
  return rows[0].id
}

export type StuckAuction = {
  id: string
  title: string
  current_price: number
  ends_at: Date
  bid_count: number
}

/**
 * 마감 시각이 지났는데 스케줄러가 확정하지 못한 경매.
 * 최고입찰자가 계정을 지운 경우다. 사람이 손대기 전까지 매분 다시 보고된다.
 */
export async function listStuckAuctions() {
  const { rows } = await pool.query<StuckAuction>(
    `select a.id, p.title, a.current_price, a.ends_at,
            (select count(*) from bids b
              where b.auction_id = a.id and b.outcome = 'accepted')::int as bid_count
       from auctions a join products p on p.id = a.product_id
      where a.status = 'live' and a.ends_at <= now()
        and a.highest_bidder_id is null
        and exists (select 1 from bids b
                     where b.auction_id = a.id and b.outcome = 'accepted')
      order by a.ends_at`,
  )
  return rows
}

/** 유찰·미결제로 끝난 상품을 같은 내용으로 다시 검수에 올린다. 원본은 기록으로 남는다. */
export async function relistProduct(productId: string, sellerId: string) {
  await pool.query(`select relist_product($1, $2)`, [productId, sellerId])
}

export async function resolveStuckAuction(auctionId: string) {
  await pool.query(`select resolve_stuck_auction($1)`, [auctionId])
}

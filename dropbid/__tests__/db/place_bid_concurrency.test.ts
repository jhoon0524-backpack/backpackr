// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { createUser, pool, resetDb, seedLiveAuction, truncateAll } from './helpers'

beforeAll(async () => {
  await resetDb()
})
beforeEach(async () => {
  await truncateAll()
})
afterAll(async () => {
  await pool.end()
})

/**
 * 서로 다른 사용자 여러 명이 같은 경매에 동시에 입찰한다.
 *
 * 커넥션 풀이 25개라 DB 에 동시에 도달하는 것은 최대 25건이고 나머지는 클라이언트에서 줄을 선다.
 * 100 커넥션을 한꺼번에 여는 것은 Postgres 기본 max_connections 를 넘겨 테스트 자체가 불안정해진다.
 * 확인하려는 것은 부하가 아니라 잠금이 직렬화를 보장하는가이므로 이 정도 경합으로 충분하다.
 */
async function bidConcurrently(auctionId: string, bidderIds: string[], amount: number) {
  const results = await Promise.all(
    bidderIds.map((id) =>
      pool
        .query<{ outcome: string; reject_reason: string | null }>(
          // 한 줄에서 place_bid 를 두 번 부르면 입찰이 두 번 들어간다. 반드시 한 번만 부른다.
          `with r as (select place_bid($1,$2,$3) as j)
           select j->>'outcome' as outcome, j->>'reject_reason' as reject_reason from r`,
          [auctionId, id, amount],
        )
        .then((r) => r.rows[0]),
    ),
  )
  return results
}

describe('동시 입찰 — PRD 인수 조건', () => {
  test('100명이 동시에 같은 금액을 넣으면 정확히 1건만 성공한다', async () => {
    // Given 경매가 live 이고 현재가 10,000원
    const { auctionId } = await seedLiveAuction({ startPrice: 10000 })
    const firstBidder = await createUser('첫 입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, firstBidder])

    const bidders = await Promise.all(
      Array.from({ length: 100 }, (_, i) => createUser(`입찰자${i}`)),
    )

    // When 서로 다른 사용자 100명이 동시에 11,000원을 입찰
    const results = await bidConcurrently(auctionId, bidders, 11000)

    // Then 정확히 1건만 성공하고 99건은 금액 부족으로 거부되며 최고입찰자는 1명이다
    const accepted = results.filter((r) => r.outcome === 'accepted')
    const rejected = results.filter((r) => r.outcome === 'rejected')

    expect(accepted).toHaveLength(1)
    expect(rejected).toHaveLength(99)
    expect(new Set(rejected.map((r) => r.reject_reason))).toEqual(new Set(['amount_too_low']))

    const { rows } = await pool.query<{ current_price: number; highest_bidder_id: string }>(
      `select current_price, highest_bidder_id from auctions where id = $1`,
      [auctionId],
    )
    expect(rows[0].current_price).toBe(11000)
    expect(bidders).toContain(rows[0].highest_bidder_id)
  })

  test('동시 입찰이어도 모든 시도가 빠짐없이 기록된다', async () => {
    const { auctionId } = await seedLiveAuction({ startPrice: 10000 })
    const bidders = await Promise.all(Array.from({ length: 30 }, (_, i) => createUser(`입찰자${i}`)))

    await bidConcurrently(auctionId, bidders, 11000)

    const { rows } = await pool.query<{ total: string; accepted: string }>(
      `select count(*)::text as total,
              count(*) filter (where outcome = 'accepted')::text as accepted
       from bids where auction_id = $1`,
      [auctionId],
    )
    expect(rows[0].total).toBe('30')
    expect(rows[0].accepted).toBe('1')
  })

  test('마감 임박 동시 입찰에서도 연장은 성공한 입찰 수만큼만 일어난다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidders = await Promise.all(Array.from({ length: 20 }, (_, i) => createUser(`입찰자${i}`)))
    await pool.query(`update auctions set ends_at = now() + interval '5 seconds' where id = $1`, [
      auctionId,
    ])

    const results = await bidConcurrently(auctionId, bidders, 10000)

    const acceptedCount = results.filter((r) => r.outcome === 'accepted').length
    const { rows } = await pool.query<{ extension_count: number }>(
      `select extension_count from auctions where id = $1`,
      [auctionId],
    )
    expect(acceptedCount).toBe(1)
    expect(rows[0].extension_count).toBe(1)
  })
})

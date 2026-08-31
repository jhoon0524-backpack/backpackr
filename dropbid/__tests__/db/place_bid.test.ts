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

type BidResult = {
  outcome: 'accepted' | 'rejected'
  reject_reason: string | null
  current_price: number
  min_next_amount: number
  ends_at: string
  extended: boolean
}

async function placeBid(auctionId: string, userId: string, amount: number) {
  const { rows } = await pool.query<{ result: BidResult }>(
    `select place_bid($1, $2, $3) as result`,
    [auctionId, userId, amount],
  )
  return rows[0].result
}

async function auctionRow(auctionId: string) {
  const { rows } = await pool.query<{
    current_price: number
    highest_bidder_id: string | null
    ends_at: Date
    extension_count: number
  }>(`select current_price, highest_bidder_id, ends_at, extension_count from auctions where id = $1`, [
    auctionId,
  ])
  return rows[0]
}

describe('거부 규칙 — PRD 의 순서 그대로', () => {
  test('경매가 live 가 아니면 거부한다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`update auctions set status = 'scheduled' where id = $1`, [auctionId])

    const result = await placeBid(auctionId, bidder, 20000)

    expect(result.outcome).toBe('rejected')
    expect(result.reject_reason).toBe('not_live')
  })

  test('마감 시각이 지났으면 status 가 live 여도 거부한다', async () => {
    // 마감 처리 스케줄러는 1분 주기라 마감 직후 잠깐은 live 로 남는다.
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`update auctions set ends_at = now() - interval '10 seconds' where id = $1`, [
      auctionId,
    ])

    const result = await placeBid(auctionId, bidder, 20000)

    expect(result.outcome).toBe('rejected')
    expect(result.reject_reason).toBe('not_live')
  })

  test('판매자 본인은 거부한다', async () => {
    const { auctionId, sellerId } = await seedLiveAuction()

    const result = await placeBid(auctionId, sellerId, 20000)

    expect(result.outcome).toBe('rejected')
    expect(result.reject_reason).toBe('seller_cannot_bid')
  })

  test('현재 최고입찰자 본인은 거부한다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await placeBid(auctionId, bidder, 10000)

    const result = await placeBid(auctionId, bidder, 20000)

    expect(result.outcome).toBe('rejected')
    expect(result.reject_reason).toBe('already_highest')
  })

  test('현재가 + 최소 인상폭 미만이면 거부한다', async () => {
    const { auctionId } = await seedLiveAuction({ startPrice: 10000 })
    const first = await createUser('입찰자A')
    const second = await createUser('입찰자B')
    await placeBid(auctionId, first, 10000)

    const result = await placeBid(auctionId, second, 10500)

    expect(result.outcome).toBe('rejected')
    expect(result.reject_reason).toBe('amount_too_low')
    expect(result.min_next_amount).toBe(11000)
  })

  test('거부된 시도도 사유 코드와 함께 기록된다', async () => {
    // PRD 인수 조건: 모든 입찰 시도(성공·거부)가 사유 코드와 함께 기록된다.
    const { auctionId, sellerId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await placeBid(auctionId, sellerId, 20000)
    await placeBid(auctionId, bidder, 500)

    const { rows } = await pool.query<{ outcome: string; reject_reason: string }>(
      `select outcome, reject_reason from bids order by created_at`,
    )
    expect(rows).toEqual([
      { outcome: 'rejected', reject_reason: 'seller_cannot_bid' },
      { outcome: 'rejected', reject_reason: 'amount_too_low' },
    ])
  })
})

describe('최소 인상폭 구간', () => {
  test.each([
    [9999, 500],
    [10000, 1000],
    [49999, 1000],
    [50000, 5000],
  ])('현재가 %i원이면 인상폭은 %i원이다', async (price, expected) => {
    const { rows } = await pool.query<{ increment: number }>(
      `select bid_increment($1) as increment`,
      [price],
    )
    expect(rows[0].increment).toBe(expected)
  })

  test('첫 입찰은 시작가 그대로 받는다', async () => {
    // PRD 는 "현재가 + 인상폭" 만 적었지만, 그대로면 시작가가 의미를 잃는다.
    const { auctionId } = await seedLiveAuction({ startPrice: 10000 })
    const bidder = await createUser('입찰자')

    const result = await placeBid(auctionId, bidder, 10000)

    expect(result.outcome).toBe('accepted')
    expect(result.current_price).toBe(10000)
    expect(result.min_next_amount).toBe(11000)
  })
})

describe('입찰 성공', () => {
  test('현재가와 최고입찰자를 갱신한다', async () => {
    const { auctionId } = await seedLiveAuction({ startPrice: 10000 })
    const first = await createUser('입찰자A')
    const second = await createUser('입찰자B')
    await placeBid(auctionId, first, 10000)

    const result = await placeBid(auctionId, second, 11000)

    expect(result.outcome).toBe('accepted')
    const auction = await auctionRow(auctionId)
    expect(auction.current_price).toBe(11000)
    expect(auction.highest_bidder_id).toBe(second)
  })
})

describe('마감 임박 연장', () => {
  test('마감 5초 전 입찰이면 마감 시각이 정확히 30초 밀린다', async () => {
    // PRD 인수 조건: 마감 5초 전 유효한 입찰 → 기록되고 마감이 30초 연장된다.
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`update auctions set ends_at = now() + interval '5 seconds' where id = $1`, [
      auctionId,
    ])
    const before = await auctionRow(auctionId)

    const result = await placeBid(auctionId, bidder, 10000)
    const after = await auctionRow(auctionId)

    expect(result.outcome).toBe('accepted')
    expect(result.extended).toBe(true)
    expect(after.ends_at.getTime() - before.ends_at.getTime()).toBe(30_000)
    expect(after.extension_count).toBe(1)
  })

  test('마감이 멀면 연장하지 않는다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    const before = await auctionRow(auctionId)

    const result = await placeBid(auctionId, bidder, 10000)
    const after = await auctionRow(auctionId)

    expect(result.extended).toBe(false)
    expect(after.ends_at.getTime()).toBe(before.ends_at.getTime())
    expect(after.extension_count).toBe(0)
  })

  test('연장 20회에 도달하면 입찰은 받되 더 이상 연장하지 않는다', async () => {
    // PRD 엣지케이스.
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(
      `update auctions set extension_count = 20, ends_at = now() + interval '5 seconds'
       where id = $1`,
      [auctionId],
    )
    const before = await auctionRow(auctionId)

    const result = await placeBid(auctionId, bidder, 10000)
    const after = await auctionRow(auctionId)

    expect(result.outcome).toBe('accepted')
    expect(result.extended).toBe(false)
    expect(after.ends_at.getTime()).toBe(before.ends_at.getTime())
    expect(after.extension_count).toBe(20)
  })
})

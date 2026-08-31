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

async function closeDue() {
  const { rows } = await pool.query<{ auction_id: string; result: string }>(
    `select * from close_due_auctions()`,
  )
  return rows
}

/** 마감 시각을 과거로 당긴다. 테스트에서 마감 도래를 만드는 유일한 방법이다. */
async function expire(auctionId: string) {
  await pool.query(`update auctions set ends_at = now() - interval '1 second' where id = $1`, [
    auctionId,
  ])
}

async function auctionStatus(auctionId: string) {
  const { rows } = await pool.query<{ status: string; winner_id: string | null }>(
    `select status, winner_id from auctions where id = $1`,
    [auctionId],
  )
  return rows[0]
}

describe('마감 처리', () => {
  test('입찰이 있으면 최고입찰자를 낙찰자로 확정하고 sold 가 된다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)

    const processed = await closeDue()

    expect(processed).toEqual([{ auction_id: auctionId, result: 'sold' }])
    expect(await auctionStatus(auctionId)).toEqual({ status: 'sold', winner_id: bidder })
  })

  test('입찰이 없으면 unsold 가 된다', async () => {
    const { auctionId } = await seedLiveAuction()
    await expire(auctionId)

    const processed = await closeDue()

    expect(processed).toEqual([{ auction_id: auctionId, result: 'unsold' }])
    expect(await auctionStatus(auctionId)).toEqual({ status: 'unsold', winner_id: null })
  })

  test('마감 시각이 아직 안 됐으면 건드리지 않는다', async () => {
    const { auctionId } = await seedLiveAuction()

    expect(await closeDue()).toEqual([])
    expect((await auctionStatus(auctionId)).status).toBe('live')
  })

  test('낙찰되면 결제 기한 24시간짜리 주문이 생긴다', async () => {
    const { auctionId } = await seedLiveAuction({ startPrice: 10000 })
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)

    await closeDue()

    const { rows } = await pool.query<{
      buyer_id: string
      amount: number
      status: string
      hours: number
    }>(
      `select buyer_id, amount, status,
              round(extract(epoch from (due_at - now())) / 3600) as hours
         from orders where auction_id = $1`,
      [auctionId],
    )
    expect(rows[0].buyer_id).toBe(bidder)
    expect(rows[0].amount).toBe(10000)
    expect(rows[0].status).toBe('pending')
    expect(Number(rows[0].hours)).toBe(24)
  })
})

describe('멱등 — PRD 인수 조건', () => {
  test('두 번 연속 실행해도 낙찰은 1회만 확정된다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)

    const first = await closeDue()
    const second = await closeDue()

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(0)

    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from orders where auction_id = $1`,
      [auctionId],
    )
    expect(rows[0].count).toBe('1')
  })

  test('유찰도 두 번 처리되지 않는다', async () => {
    const { auctionId } = await seedLiveAuction()
    await expire(auctionId)

    expect(await closeDue()).toHaveLength(1)
    expect(await closeDue()).toHaveLength(0)
  })

  test('동시에 두 번 실행해도 주문은 하나만 생긴다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)

    const [a, b] = await Promise.all([closeDue(), closeDue()])

    expect(a.length + b.length).toBe(1)
    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from orders`,
    )
    expect(rows[0].count).toBe('1')
  })
})

describe('여러 건을 한 번에', () => {
  test('마감된 것만 골라 낙찰·유찰을 한 번에 처리한다', async () => {
    const withBid = await seedLiveAuction()
    const withoutBid = await seedLiveAuction()
    const notDue = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [withBid.auctionId, bidder])
    await expire(withBid.auctionId)
    await expire(withoutBid.auctionId)

    const processed = await closeDue()

    expect(processed).toHaveLength(2)
    expect(processed.find((p) => p.auction_id === withBid.auctionId)?.result).toBe('sold')
    expect(processed.find((p) => p.auction_id === withoutBid.auctionId)?.result).toBe('unsold')
    expect((await auctionStatus(notDue.auctionId)).status).toBe('live')
  })
})

describe('최고입찰자가 계정을 지운 경우', () => {
  test('자동 확정하지 않고 운영자에게 넘긴다', async () => {
    // PRD 엣지케이스. 낙찰 자격은 살아 있으나 결제할 상대가 없다.
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await pool.query(`delete from auth.users where id = $1`, [bidder])
    await expire(auctionId)

    const processed = await closeDue()

    expect(processed).toEqual([{ auction_id: auctionId, result: 'needs_operator' }])
    // 입찰 기록은 익명으로 남아 있다.
    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from bids where auction_id = $1 and outcome = 'accepted'`,
      [auctionId],
    )
    expect(rows[0].count).toBe('1')
    // 마감 시각이 지났으므로 새 입찰로 되살아나지 않는다.
    const other = await createUser('다른 입찰자')
    const { rows: bidRows } = await pool.query<{ reason: string }>(
      `with r as (select place_bid($1,$2,99999) as j) select j->>'reject_reason' as reason from r`,
      [auctionId, other],
    )
    expect(bidRows[0].reason).toBe('not_live')
  })
})

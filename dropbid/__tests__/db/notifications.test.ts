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

async function expire(auctionId: string) {
  await pool.query(`update auctions set ends_at = now() - interval '1 second' where id = $1`, [
    auctionId,
  ])
}

/** 적재된 알림을 (종류, 수신자) 로 뽑는다. */
async function queued(auctionId: string) {
  const { rows } = await pool.query<{ kind: string; user_id: string; status: string }>(
    `select kind, user_id, status from notifications where auction_id = $1 order by kind`,
    [auctionId],
  )
  return rows
}

describe('낙찰 — 판매자와 낙찰자 모두에게', () => {
  test('낙찰되면 두 사람 몫이 적재된다', async () => {
    // PRD: 낙찰·유찰이 확정되면 판매자와 낙찰자에게 알린다.
    const { auctionId, sellerId } = await seedLiveAuction()
    const bidder = await createUser('낙찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)

    await pool.query(`select close_due_auctions()`)

    expect(await queued(auctionId)).toEqual([
      { kind: 'sold', user_id: sellerId, status: 'pending' },
      { kind: 'won', user_id: bidder, status: 'pending' },
    ])
  })

  test('유찰되면 판매자 몫만 적재된다', async () => {
    const { auctionId, sellerId } = await seedLiveAuction()
    await expire(auctionId)

    await pool.query(`select close_due_auctions()`)

    expect(await queued(auctionId)).toEqual([
      { kind: 'unsold', user_id: sellerId, status: 'pending' },
    ])
  })
})

describe('멱등 — PRD 인수 조건', () => {
  test('스케줄러가 두 번 돌아도 알림은 한 번만 적재된다', async () => {
    // Given 마감 시각이 지난 live 경매, When 스케줄러가 두 번 연속 실행됨,
    // Then 낙찰은 1회만 확정되고 알림도 1회만 발송된다.
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('낙찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)

    await pool.query(`select run_close_due_auctions()`)
    await pool.query(`select run_close_due_auctions()`)

    expect(await queued(auctionId)).toHaveLength(2)
  })

  test('동시에 두 번 돌아도 알림은 한 번만 적재된다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('낙찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)

    await Promise.all([
      pool.query(`select close_due_auctions()`),
      pool.query(`select close_due_auctions()`),
    ])

    expect(await queued(auctionId)).toHaveLength(2)
  })

  test('이미 보낸 알림은 다시 pending 이 되지 않는다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('낙찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)
    await pool.query(`select close_due_auctions()`)

    // 발송기가 보냈다고 표시한 뒤 스케줄러가 또 돈다.
    await pool.query(
      `update notifications set status='sent', channel='alimtalk', sent_at=now()
       where auction_id = $1`,
      [auctionId],
    )
    await pool.query(`select close_due_auctions()`)

    const { rows } = await pool.query<{ status: string; count: string }>(
      `select status, count(*)::text as count from notifications where auction_id = $1
       group by status`,
      [auctionId],
    )
    expect(rows).toEqual([{ status: 'sent', count: '2' }])
  })
})

describe('결제 기한 만료', () => {
  test('미결제로 넘어가면 판매자 몫이 적재된다', async () => {
    const { auctionId, sellerId } = await seedLiveAuction()
    const bidder = await createUser('낙찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)
    await pool.query(`select close_due_auctions()`)
    await pool.query(`update orders set due_at = now() - interval '1 second'`)

    await pool.query(`select expire_unpaid_orders()`)

    const rows = await queued(auctionId)
    expect(rows).toContainEqual({
      kind: 'payment_failed',
      user_id: sellerId,
      status: 'pending',
    })
  })

  test('두 번 돌려도 한 번만 적재된다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('낙찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)
    await pool.query(`select close_due_auctions()`)
    await pool.query(`update orders set due_at = now() - interval '1 second'`)

    await pool.query(`select expire_unpaid_orders()`)
    await pool.query(`select expire_unpaid_orders()`)

    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from notifications
        where auction_id = $1 and kind = 'payment_failed'`,
      [auctionId],
    )
    expect(rows[0].count).toBe('1')
  })
})

describe('최고입찰자가 계정을 지운 경우', () => {
  test('자동 확정하지 않으므로 알림도 적재하지 않는다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await pool.query(`delete from auth.users where id = $1`, [bidder])
    await expire(auctionId)

    await pool.query(`select close_due_auctions()`)

    expect(await queued(auctionId)).toEqual([])
  })
})

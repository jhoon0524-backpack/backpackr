// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { createUser, pool, resetDb, seedLiveAuction, truncateAll } from './helpers'

beforeAll(async () => {
  await resetDb()
})
beforeEach(async () => {
  await truncateAll()
  await pool.query(`truncate scheduler_runs`)
})
afterAll(async () => {
  await pool.end()
})

/** 낙찰까지 진행시켜 결제 대기(pending) 주문을 만든다. */
async function seedPendingOrder() {
  const { auctionId } = await seedLiveAuction()
  const bidder = await createUser('낙찰자')
  await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
  await pool.query(`update auctions set ends_at = now() - interval '1 second' where id = $1`, [
    auctionId,
  ])
  await pool.query(`select close_due_auctions()`)
  const { rows } = await pool.query<{ id: string }>(
    `select id from orders where auction_id = $1`,
    [auctionId],
  )
  return { auctionId, orderId: rows[0].id, bidder }
}

async function expireDue() {
  const { rows } = await pool.query<{ order_id: string; auction_id: string }>(
    `select * from expire_unpaid_orders()`,
  )
  return rows
}

async function statuses(auctionId: string) {
  const { rows } = await pool.query<{ order_status: string; auction_status: string }>(
    `select o.status as order_status, a.status as auction_status
       from orders o join auctions a on a.id = o.auction_id
      where o.auction_id = $1`,
    [auctionId],
  )
  return rows[0]
}

describe('결제 기한 만료 — PRD 인수 조건', () => {
  test('기한이 지나면 payment_failed 로 넘어간다', async () => {
    // Given 낙찰 후 24시간 경과, When 결제가 없음, Then payment_failed 로 전환된다.
    const { auctionId, orderId } = await seedPendingOrder()
    await pool.query(`update orders set due_at = now() - interval '1 second' where id = $1`, [
      orderId,
    ])

    const expired = await expireDue()

    expect(expired).toEqual([{ order_id: orderId, auction_id: auctionId }])
    expect(await statuses(auctionId)).toEqual({
      order_status: 'failed',
      auction_status: 'payment_failed',
    })
  })

  test('기한 안이면 건드리지 않는다', async () => {
    const { auctionId } = await seedPendingOrder()

    expect(await expireDue()).toEqual([])
    expect(await statuses(auctionId)).toEqual({
      order_status: 'pending',
      auction_status: 'sold',
    })
  })

  test('이미 결제한 주문은 기한이 지나도 건드리지 않는다', async () => {
    const { auctionId, orderId } = await seedPendingOrder()
    await pool.query(
      `update orders set status = 'paid', paid_at = now(), due_at = now() - interval '1 day'
       where id = $1`,
      [orderId],
    )

    expect(await expireDue()).toEqual([])
    expect((await statuses(auctionId)).order_status).toBe('paid')
  })

  test('두 번 돌려도 한 번만 처리한다', async () => {
    const { orderId } = await seedPendingOrder()
    await pool.query(`update orders set due_at = now() - interval '1 second' where id = $1`, [
      orderId,
    ])

    expect(await expireDue()).toHaveLength(1)
    expect(await expireDue()).toHaveLength(0)
  })
})

describe('스케줄러가 마감과 만료를 함께 돌린다', () => {
  test('만료 건수가 실행 기록에 남는다', async () => {
    const { orderId } = await seedPendingOrder()
    await pool.query(`update orders set due_at = now() - interval '1 second' where id = $1`, [
      orderId,
    ])

    const { rows } = await pool.query<{ processed: number; detail: Record<string, number> }>(
      `select processed, detail from run_close_due_auctions()`,
    )

    expect(rows[0].processed).toBe(1)
    expect(rows[0].detail).toEqual({ payment_failed: 1 })
  })

  test('마감과 만료가 같은 실행에 함께 기록된다', async () => {
    const { orderId } = await seedPendingOrder()
    await pool.query(`update orders set due_at = now() - interval '1 second' where id = $1`, [
      orderId,
    ])
    const unsold = await seedLiveAuction()
    await pool.query(`update auctions set ends_at = now() - interval '1 second' where id = $1`, [
      unsold.auctionId,
    ])

    const { rows } = await pool.query<{ processed: number; detail: Record<string, number> }>(
      `select processed, detail from run_close_due_auctions()`,
    )

    expect(rows[0].processed).toBe(2)
    expect(rows[0].detail).toEqual({ unsold: 1, payment_failed: 1 })
  })
})

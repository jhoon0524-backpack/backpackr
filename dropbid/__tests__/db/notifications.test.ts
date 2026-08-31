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

describe('상위 입찰 알림', () => {
  test('밀려난 직전 최고입찰자에게 적재된다', async () => {
    const { auctionId } = await seedLiveAuction({ startPrice: 10000 })
    const first = await createUser('먼저')
    const second = await createUser('나중')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, first])

    await pool.query(`select place_bid($1, $2, 11000)`, [auctionId, second])

    const rows = await queued(auctionId)
    expect(rows).toEqual([{ kind: 'outbid', user_id: first, status: 'pending' }])
  })

  test('첫 입찰은 밀어낼 사람이 없으므로 적재하지 않는다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('첫 입찰자')

    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])

    expect(await queued(auctionId)).toEqual([])
  })

  test('같은 사람이 여러 번 밀리면 그때마다 적재된다', async () => {
    // 다른 알림과 달리 "경매당 한 번" 이 아니다. 밀릴 때마다 알려야 한다.
    const { auctionId } = await seedLiveAuction({ startPrice: 10000 })
    const a = await createUser('A')
    const b = await createUser('B')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, a])
    await pool.query(`select place_bid($1, $2, 11000)`, [auctionId, b])
    await pool.query(`select place_bid($1, $2, 12000)`, [auctionId, a])
    await pool.query(`select place_bid($1, $2, 13000)`, [auctionId, b])

    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from notifications
        where auction_id = $1 and kind = 'outbid' and user_id = $2`,
      [auctionId, a],
    )
    expect(rows[0].count).toBe('2')
  })

  test('거부된 입찰은 아무에게도 알리지 않는다', async () => {
    const { auctionId } = await seedLiveAuction({ startPrice: 10000 })
    const first = await createUser('먼저')
    const second = await createUser('나중')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, first])

    await pool.query(`select place_bid($1, $2, 10500)`, [auctionId, second]) // 인상폭 부족

    expect(await queued(auctionId)).toEqual([])
  })
})

describe('검수 반려 알림', () => {
  test('반려하면 판매자에게 적재된다', async () => {
    const seller = await createUser('판매자')
    const { rows } = await pool.query<{ id: string }>(
      `insert into products (seller_id, title, funding_project_name, category,
         condition_grade, photo_urls, backer_proof_url, start_price)
       values ($1,'상품','펀딩','만화','A',array['1','2','3'],'proof',10000) returning id`,
      [seller],
    )

    await pool.query(`select reject_product($1, $2)`, [rows[0].id, '인증 이미지가 흐립니다'])

    const { rows: n } = await pool.query<{ kind: string; user_id: string; product_id: string }>(
      `select kind, user_id, product_id from notifications`,
    )
    expect(n).toEqual([
      { kind: 'product_rejected', user_id: seller, product_id: rows[0].id },
    ])
  })
})

describe('결제 기한 임박 알림', () => {
  async function seedWinner() {
    const { auctionId } = await seedLiveAuction()
    const buyer = await createUser('낙찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, buyer])
    await expire(auctionId)
    await pool.query(`select close_due_auctions()`)
    return { auctionId, buyer }
  }

  test('기한 3시간 안으로 들어오면 적재된다', async () => {
    const { auctionId, buyer } = await seedWinner()
    await pool.query(`update orders set due_at = now() + interval '2 hours'`)

    await pool.query(`select notify_payment_due()`)

    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from notifications
        where auction_id = $1 and user_id = $2 and kind = 'payment_due'`,
      [auctionId, buyer],
    )
    expect(rows[0].count).toBe('1')
  })

  test('아직 3시간 넘게 남았으면 적재하지 않는다', async () => {
    await seedWinner()
    await pool.query(`update orders set due_at = now() + interval '10 hours'`)

    await pool.query(`select notify_payment_due()`)

    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from notifications where kind = 'payment_due'`,
    )
    expect(rows[0].count).toBe('0')
  })

  test('매분 돌아도 한 번만 적재된다', async () => {
    await seedWinner()
    await pool.query(`update orders set due_at = now() + interval '2 hours'`)

    await pool.query(`select notify_payment_due()`)
    await pool.query(`select notify_payment_due()`)
    await pool.query(`select notify_payment_due()`)

    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from notifications where kind = 'payment_due'`,
    )
    expect(rows[0].count).toBe('1')
  })

  test('기한이 이미 지났으면 적재하지 않는다', async () => {
    // 그건 만료 처리가 할 일이다.
    await seedWinner()
    await pool.query(`update orders set due_at = now() - interval '1 minute'`)

    await pool.query(`select notify_payment_due()`)

    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from notifications where kind = 'payment_due'`,
    )
    expect(rows[0].count).toBe('0')
  })

  test('스케줄러 실행 기록에 남는다', async () => {
    await seedWinner()
    await pool.query(`update orders set due_at = now() + interval '2 hours'`)

    const { rows } = await pool.query<{ detail: Record<string, number> }>(
      `select detail from run_close_due_auctions()`,
    )
    expect(rows[0].detail).toEqual({ payment_due: 1 })
  })
})

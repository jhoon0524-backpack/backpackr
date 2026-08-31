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

/** 최고입찰자가 계정을 지워 스케줄러가 손대지 못하는 경매를 만든다. */
async function seedStuck() {
  const { auctionId, sellerId } = await seedLiveAuction()
  const bidder = await createUser('사라질 입찰자')
  await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
  await pool.query(`delete from auth.users where id = $1`, [bidder])
  await expire(auctionId)
  await pool.query(`select run_close_due_auctions()`)
  return { auctionId, sellerId }
}

describe('막힌 경매를 운영자가 마무리한다', () => {
  test('유찰로 마무리하고 판매자에게 알림이 적재된다', async () => {
    const { auctionId, sellerId } = await seedStuck()

    await pool.query(`select resolve_stuck_auction($1)`, [auctionId])

    const { rows } = await pool.query<{ status: string }>(
      `select status from auctions where id = $1`,
      [auctionId],
    )
    expect(rows[0].status).toBe('unsold')

    const { rows: n } = await pool.query<{ kind: string; user_id: string }>(
      `select kind, user_id from notifications where auction_id = $1`,
      [auctionId],
    )
    expect(n).toEqual([{ kind: 'unsold', user_id: sellerId }])
  })

  test('입찰 기록은 익명으로 그대로 남는다', async () => {
    const { auctionId } = await seedStuck()

    await pool.query(`select resolve_stuck_auction($1)`, [auctionId])

    const { rows } = await pool.query<{ count: string; bidder: string | null }>(
      `select count(*)::text as count, max(bidder_id::text) as bidder
         from bids where auction_id = $1 and outcome = 'accepted'`,
      [auctionId],
    )
    expect(rows[0].count).toBe('1')
    expect(rows[0].bidder).toBeNull()
  })

  test('처리하고 나면 스케줄러가 더는 보고하지 않는다', async () => {
    // 이게 목적이다. 지금까지는 매분 needs_operator 가 떴다.
    const { auctionId } = await seedStuck()
    await pool.query(`select resolve_stuck_auction($1)`, [auctionId])

    const { rows } = await pool.query<{ detail: Record<string, number> }>(
      `select detail from run_close_due_auctions()`,
    )
    expect(rows[0].detail).toEqual({})
  })

  test('멀쩡히 진행 중인 경매는 손대지 못한다', async () => {
    const { auctionId } = await seedLiveAuction()

    await expect(pool.query(`select resolve_stuck_auction($1)`, [auctionId])).rejects.toThrow(
      /처리되지 않은 경매가 아니다/,
    )
  })

  test('최고입찰자가 있는 경매는 손대지 못한다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)

    await expect(pool.query(`select resolve_stuck_auction($1)`, [auctionId])).rejects.toThrow(
      /최고입찰자가 있는 경매/,
    )
  })

  test('입찰이 없는 경매는 손대지 못한다', async () => {
    // 그건 스케줄러가 알아서 유찰 처리한다.
    const { auctionId } = await seedLiveAuction()
    await expire(auctionId)

    await expect(pool.query(`select resolve_stuck_auction($1)`, [auctionId])).rejects.toThrow(
      /입찰이 없는 경매/,
    )
  })

  test.each(['anon', 'authenticated'])('%s 는 부를 수 없다', async (role) => {
    const { auctionId } = await seedStuck()
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(`set local role ${role}`)
      await expect(
        client.query(`select resolve_stuck_auction($1)`, [auctionId]),
      ).rejects.toThrow()
    } finally {
      await client.query('rollback').catch(() => {})
      client.release()
    }
  })
})

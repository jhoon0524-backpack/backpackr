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

async function runScheduler() {
  const { rows } = await pool.query<{ processed: number; detail: Record<string, number> }>(
    `select processed, detail from run_close_due_auctions()`,
  )
  return rows[0]
}

async function expire(auctionId: string) {
  await pool.query(`update auctions set ends_at = now() - interval '1 second' where id = $1`, [
    auctionId,
  ])
}

describe('스케줄러 기록 — PRD 인수 조건', () => {
  test('처리한 것이 없어도 실행을 기록한다', async () => {
    // 기록이 끊긴 구간이 곧 스케줄러가 멈춘 구간이다. 0건 실행도 남겨야 그걸 알 수 있다.
    const run = await runScheduler()

    expect(run.processed).toBe(0)
    expect(run.detail).toEqual({})

    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from scheduler_runs where job = 'close_due_auctions'`,
    )
    expect(rows[0].count).toBe('1')
  })

  test('처리 건수를 결과별로 기록한다', async () => {
    const sold = await seedLiveAuction()
    const unsold = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [sold.auctionId, bidder])
    await expire(sold.auctionId)
    await expire(unsold.auctionId)

    const run = await runScheduler()

    expect(run.processed).toBe(2)
    expect(run.detail).toEqual({ sold: 1, unsold: 1 })
  })

  test('실행할 때마다 한 줄씩 쌓인다', async () => {
    await runScheduler()
    await runScheduler()
    await runScheduler()

    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from scheduler_runs`,
    )
    expect(rows[0].count).toBe('3')
  })

  test('마감 처리와 같은 멱등성을 갖는다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await expire(auctionId)

    const first = await runScheduler()
    const second = await runScheduler()

    expect(first.processed).toBe(1)
    expect(second.processed).toBe(0)

    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from orders`,
    )
    expect(rows[0].count).toBe('1')
  })
})

describe('스케줄러 기록 권한', () => {
  test.each(['anon', 'authenticated'])('%s 는 스케줄러를 부를 수 없다', async (role) => {
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(`set local role ${role}`)
      await expect(client.query(`select run_close_due_auctions()`)).rejects.toThrow()
    } finally {
      await client.query('rollback').catch(() => {})
      client.release()
    }
  })
})

describe('사람이 손대야 하는 건은 처리 건수에 넣지 않는다', () => {
  test('needs_operator 는 processed 로 세지 않는다', async () => {
    // 최고입찰자가 계정을 지운 경매는 자동 확정하지 않고 그대로 둔다.
    // 매 실행마다 다시 잡히므로, 이걸 처리한 것으로 세면 1분마다 지표가 오염된다.
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await pool.query(`delete from auth.users where id = $1`, [bidder])
    await expire(auctionId)

    const run = await runScheduler()

    expect(run.processed).toBe(0)
    // 사람이 손대기 전까지 계속 떠 있어야 하는 알림이라 detail 에는 남긴다.
    expect(run.detail).toEqual({ needs_operator: 1 })
  })

  test('여러 번 돌려도 처리 건수는 계속 0 이다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, bidder])
    await pool.query(`delete from auth.users where id = $1`, [bidder])
    await expire(auctionId)

    const runs = [await runScheduler(), await runScheduler(), await runScheduler()]

    expect(runs.map((r) => r.processed)).toEqual([0, 0, 0])
    expect(runs.every((r) => r.detail.needs_operator === 1)).toBe(true)
  })

  test('실제로 처리한 것과 섞여 있으면 처리한 것만 센다', async () => {
    const stuck = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [stuck.auctionId, bidder])
    await pool.query(`delete from auth.users where id = $1`, [bidder])
    await expire(stuck.auctionId)

    const unsold = await seedLiveAuction()
    await expire(unsold.auctionId)

    const run = await runScheduler()

    expect(run.processed).toBe(1)
    expect(run.detail).toEqual({ unsold: 1, needs_operator: 1 })
  })
})

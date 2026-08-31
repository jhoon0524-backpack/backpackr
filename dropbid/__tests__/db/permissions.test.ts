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
 * 지정한 역할로 한 문장을 실행하고, 막히면 true 를 준다.
 * 트랜잭션 안에서 `set local role` 을 쓰고 반드시 되돌린다.
 */
async function blockedAs(role: string, sql: string, params: unknown[] = []) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(`set local role ${role}`)
    await client.query(sql, params)
    await client.query('rollback')
    return false
  } catch {
    await client.query('rollback').catch(() => {})
    return true
  } finally {
    client.release()
  }
}

describe('직접 쓰기 차단 — PRD 인수 조건', () => {
  test.each(['anon', 'authenticated'])('%s 는 bids 에 직접 쓸 수 없다', async (role) => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    expect(
      await blockedAs(
        role,
        `insert into bids (auction_id, bidder_id, amount, outcome)
         values ($1, $2, 99999, 'accepted')`,
        [auctionId, bidder],
      ),
    ).toBe(true)
  })

  test.each(['anon', 'authenticated'])('%s 는 auctions 의 현재가를 못 바꾼다', async (role) => {
    const { auctionId } = await seedLiveAuction()
    expect(
      await blockedAs(role, `update auctions set current_price = 1 where id = $1`, [auctionId]),
    ).toBe(true)
  })

  test.each(['anon', 'authenticated'])('%s 는 입찰 기록을 지울 수 없다', async (role) => {
    // 입찰은 취소할 수 없다 (PRD).
    await seedLiveAuction()
    expect(await blockedAs(role, `delete from bids`)).toBe(true)
  })

  test.each(['anon', 'authenticated'])('%s 는 경매와 입찰을 읽을 수는 있다', async (role) => {
    await seedLiveAuction()
    expect(await blockedAs(role, `select count(*) from auctions`)).toBe(false)
    expect(await blockedAs(role, `select count(*) from bids`)).toBe(false)
  })
})

describe('함수 실행 권한', () => {
  test.each(['anon', 'authenticated'])('%s 는 place_bid 를 부를 수 없다', async (role) => {
    // user_id 를 인자로 받으므로 브라우저가 직접 부르면 남의 이름으로 입찰할 수 있다.
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    expect(await blockedAs(role, `select place_bid($1, $2, 10000)`, [auctionId, bidder])).toBe(true)
  })

  test.each(['anon', 'authenticated'])('%s 는 마감 처리를 부를 수 없다', async (role) => {
    expect(await blockedAs(role, `select * from close_due_auctions()`)).toBe(true)
  })

  test('service_role 은 place_bid 를 부를 수 있다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidder = await createUser('입찰자')
    expect(
      await blockedAs('service_role', `select place_bid($1, $2, 10000)`, [auctionId, bidder]),
    ).toBe(false)
  })

  test('인상폭 계산은 누구나 부를 수 있다', async () => {
    // 화면이 최소 입찰가를 보여주려면 필요하다.
    expect(await blockedAs('anon', `select bid_increment(10000)`)).toBe(false)
    expect(await blockedAs('authenticated', `select bid_increment(10000)`)).toBe(false)
  })
})

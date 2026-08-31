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

/** 지정한 역할·사용자로 조회하고 보이는 행 수를 센다. */
async function visibleAs(role: string, userId: string | null, sql: string) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(`set local role ${role}`)
    if (userId) await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId])
    const { rows } = await client.query<{ count: string }>(sql)
    return Number(rows[0].count)
  } finally {
    await client.query('rollback').catch(() => {})
    client.release()
  }
}

describe('행 수준 보안 — 남의 것은 안 보인다', () => {
  test('연락처가 든 프로필은 로그인 안 한 사람에게 안 보인다', async () => {
    // 이게 없으면 브라우저 키만으로 전체 연락처를 긁을 수 있다.
    await createUser('아무개')
    expect(await visibleAs('anon', null, `select count(*) from profiles`)).toBe(0)
  })

  test('프로필은 본인 것만 보인다', async () => {
    const me = await createUser('나')
    await createUser('남')
    expect(await visibleAs('authenticated', me, `select count(*) from profiles`)).toBe(1)
  })

  test('주문은 당사자만 본다', async () => {
    const { auctionId, sellerId } = await seedLiveAuction()
    const buyer = await createUser('낙찰자')
    const stranger = await createUser('남')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, buyer])
    await pool.query(`update auctions set ends_at = now() - interval '1 second' where id = $1`, [
      auctionId,
    ])
    await pool.query(`select close_due_auctions()`)

    expect(await visibleAs('authenticated', buyer, `select count(*) from orders`)).toBe(1)
    expect(await visibleAs('authenticated', sellerId, `select count(*) from orders`)).toBe(1)
    expect(await visibleAs('authenticated', stranger, `select count(*) from orders`)).toBe(0)
    expect(await visibleAs('anon', null, `select count(*) from orders`)).toBe(0)
  })

  test('알림은 본인 것만 보인다', async () => {
    const { auctionId, sellerId } = await seedLiveAuction()
    const buyer = await createUser('낙찰자')
    await pool.query(`select place_bid($1, $2, 10000)`, [auctionId, buyer])
    await pool.query(`update auctions set ends_at = now() - interval '1 second' where id = $1`, [
      auctionId,
    ])
    await pool.query(`select close_due_auctions()`)

    expect(await visibleAs('authenticated', buyer, `select count(*) from notifications`)).toBe(1)
    expect(await visibleAs('authenticated', sellerId, `select count(*) from notifications`)).toBe(1)
    expect(await visibleAs('anon', null, `select count(*) from notifications`)).toBe(0)
  })

  test('검수 대기 중인 상품은 남에게 안 보인다', async () => {
    const seller = await createUser('판매자')
    await pool.query(
      `insert into products (seller_id, title, funding_project_name, category,
         condition_grade, photo_urls, backer_proof_url, start_price)
       values ($1, '상품', '펀딩', '만화', 'A', array['1','2','3'], 'proof', 10000)`,
      [seller],
    )
    expect(await visibleAs('anon', null, `select count(*) from products`)).toBe(0)
    expect(await visibleAs('authenticated', seller, `select count(*) from products`)).toBe(1)
  })

  test('진행 중인 경매와 상품은 누구나 본다', async () => {
    await seedLiveAuction()
    expect(await visibleAs('anon', null, `select count(*) from auctions`)).toBe(1)
    expect(await visibleAs('anon', null, `select count(*) from products`)).toBe(1)
    expect(await visibleAs('anon', null, `select count(*) from drops`)).toBe(1)
  })

  test('스케줄러 운영 기록은 아무에게도 안 보인다', async () => {
    await pool.query(`select run_close_due_auctions()`)
    expect(await visibleAs('anon', null, `select count(*) from scheduler_runs`)).toBe(0)
    const someone = await createUser('아무개')
    expect(await visibleAs('authenticated', someone, `select count(*) from scheduler_runs`)).toBe(0)
  })
})

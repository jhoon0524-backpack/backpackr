// @vitest-environment node
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { createUser, pool, resetDb, truncateAll } from './helpers'

beforeAll(async () => {
  await resetDb()
})
beforeEach(async () => {
  await truncateAll()
})
afterAll(async () => {
  await pool.end()
})

test('연락처는 정해진 형식으로만 저장된다', async () => {
  const id = await createUser('사람')

  // 빈 문자열은 null 이 아니라서 `phone is not null` 검사를 통과해 버린다. DB 에서 막는다.
  for (const bad of ['', ' ', '02-123-4567', '01012345', 'abc']) {
    await expect(
      pool.query(`update profiles set phone = $2 where id = $1`, [id, bad]),
    ).rejects.toThrow(/profiles_phone_format/)
  }

  await pool.query(`update profiles set phone = '010-5555-6666' where id = $1`, [id])
  await pool.query(`update profiles set phone = null where id = $1`, [id])

  const { rows } = await pool.query(`select phone from profiles where id = $1`, [id])
  expect(rows[0].phone).toBeNull()
})

test('연락처가 없으면 입찰이 거부되고, 넣으면 통과한다', async () => {
  const seller = await createUser('판매자')
  const bidder = await createUser('입찰자', null)

  const { rows: d } = await pool.query<{ id: string }>(
    `insert into drops (round_number, starts_at, ends_at)
     values (1, now() - interval '1 min', now() + interval '1 hour') returning id`,
  )
  const { rows: p } = await pool.query<{ id: string }>(
    `insert into products (seller_id, title, funding_project_name, category, condition_grade,
       photo_urls, backer_proof_url, start_price, status)
     values ($1,'상품','펀딩','만화','A',array['1','2','3'],'proof',10000,'scheduled')
     returning id`,
    [seller],
  )
  const { rows: a } = await pool.query<{ id: string }>(
    `insert into auctions (product_id, drop_id, status, current_price, ends_at)
     values ($1, $2, 'live', 10000, now() + interval '1 hour') returning id`,
    [p[0].id, d[0].id],
  )

  const bid = async () =>
    (await pool.query<{ j: { outcome: string; reject_reason: string | null } }>(
      `with r as (select place_bid($1,$2,$3) as j) select j from r`,
      [a[0].id, bidder, 10000],
    )).rows[0].j

  const before = await bid()
  expect(before.outcome).toBe('rejected')
  expect(before.reject_reason).toBe('no_phone')

  await pool.query(`update profiles set phone = '010-5555-6666' where id = $1`, [bidder])

  const after = await bid()
  expect(after.outcome).toBe('accepted')
})

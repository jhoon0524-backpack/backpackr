// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
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

async function createOperator(nickname = '운영자') {
  const id = await createUser(nickname)
  await pool.query(`update profiles set is_operator = true where id = $1`, [id])
  return id
}

async function seedPendingProduct(sellerId: string, title = '상품') {
  const { rows } = await pool.query<{ id: string }>(
    `insert into products (seller_id, title, funding_project_name, category,
       condition_grade, photo_urls, backer_proof_url, start_price)
     values ($1, $2, '펀딩', '만화', 'A', array['1','2','3'], 'proof', 10000)
     returning id`,
    [sellerId, title],
  )
  return rows[0].id
}

async function seedDrop(endsInSeconds = 3600) {
  const { rows } = await pool.query<{ id: string }>(
    `insert into drops (round_number, starts_at, ends_at)
     values ((select coalesce(max(round_number), 0) + 1 from drops),
             now() - interval '1 minute', now() + make_interval(secs => $1))
     returning id`,
    [endsInSeconds],
  )
  return rows[0].id
}

describe('검수는 운영자만', () => {
  test('일반 사용자가 자기 상품을 승인할 수 없다', async () => {
    const seller = await createUser('판매자')
    const productId = await seedPendingProduct(seller)
    const dropId = await seedDrop()

    await expect(
      pool.query(`select approve_product($1, $2, $3)`, [productId, dropId, seller]),
    ).rejects.toThrow(/운영자만/)

    const { rows } = await pool.query(`select status from products where id = $1`, [productId])
    expect(rows[0].status).toBe('pending')
  })

  test('일반 사용자가 반려할 수 없다', async () => {
    const seller = await createUser('판매자')
    const other = await createUser('남')
    const productId = await seedPendingProduct(seller)

    await expect(
      pool.query(`select reject_product($1, $2, $3)`, [productId, '사유', other]),
    ).rejects.toThrow(/운영자만/)
  })

  test('운영자는 승인·반려할 수 있다', async () => {
    const operator = await createOperator()
    const seller = await createUser('판매자')
    const dropId = await seedDrop()

    const approved = await seedPendingProduct(seller, '승인될 상품')
    await pool.query(`select approve_product($1, $2, $3)`, [approved, dropId, operator])

    const rejected = await seedPendingProduct(seller, '반려될 상품')
    await pool.query(`select reject_product($1, $2, $3)`, [rejected, '흐릿함', operator])

    const { rows } = await pool.query(
      `select id, status from products where id = any($1::uuid[])`,
      [[approved, rejected]],
    )
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.status]))
    expect(byId[approved]).toBe('scheduled')
    expect(byId[rejected]).toBe('rejected')
  })
})

describe('다시 올리기', () => {
  /** 상품을 만들어 경매까지 태우고 원하는 결과 상태로 만든다. */
  async function seedFinishedAuction(sellerId: string, status: 'unsold' | 'payment_failed' | 'sold') {
    const operator = await createOperator(`운영자-${status}`)
    const productId = await seedPendingProduct(sellerId, `상품-${status}`)
    const dropId = await seedDrop()
    await pool.query(`select approve_product($1, $2, $3)`, [productId, dropId, operator])

    if (status === 'sold') {
      const winner = await createUser(`낙찰자-${status}`)
      await pool.query(
        `update auctions set status = 'sold', winner_id = $2, highest_bidder_id = $2
          where product_id = $1`,
        [productId, winner],
      )
    } else {
      await pool.query(`update auctions set status = $2 where product_id = $1`, [productId, status])
    }
    return productId
  }

  test('유찰된 상품을 판매자가 다시 올리면 검수 대기로 새로 생긴다', async () => {
    const seller = await createUser('판매자')
    const productId = await seedFinishedAuction(seller, 'unsold')

    await pool.query(`select relist_product($1, $2)`, [productId, seller])

    const { rows } = await pool.query(
      `select status, relisted_from, title, start_price from products
        where relisted_from = $1`,
      [productId],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
    expect(rows[0].start_price).toBe(10000)

    // 원본은 그대로 기록으로 남는다.
    const old = await pool.query(`select status from products where id = $1`, [productId])
    expect(old.rows[0].status).toBe('scheduled')
  })

  test('미결제로 끝난 것도 다시 올릴 수 있다', async () => {
    const seller = await createUser('판매자')
    const productId = await seedFinishedAuction(seller, 'payment_failed')
    await pool.query(`select relist_product($1, $2)`, [productId, seller])
    const { rows } = await pool.query(`select 1 from products where relisted_from = $1`, [productId])
    expect(rows).toHaveLength(1)
  })

  test('낙찰된 상품은 다시 올릴 수 없다', async () => {
    const seller = await createUser('판매자')
    const productId = await seedFinishedAuction(seller, 'sold')
    await expect(
      pool.query(`select relist_product($1, $2)`, [productId, seller]),
    ).rejects.toThrow(/유찰되거나/)
  })

  test('남의 상품은 다시 올릴 수 없다', async () => {
    const seller = await createUser('판매자')
    const other = await createUser('남')
    const productId = await seedFinishedAuction(seller, 'unsold')
    await expect(
      pool.query(`select relist_product($1, $2)`, [productId, other]),
    ).rejects.toThrow(/본인이 올린 상품만/)
  })

  test('같은 상품을 두 번 다시 올릴 수 없다', async () => {
    const seller = await createUser('판매자')
    const productId = await seedFinishedAuction(seller, 'unsold')
    await pool.query(`select relist_product($1, $2)`, [productId, seller])
    await expect(
      pool.query(`select relist_product($1, $2)`, [productId, seller]),
    ).rejects.toThrow(/이미 다시 올린/)
  })
})

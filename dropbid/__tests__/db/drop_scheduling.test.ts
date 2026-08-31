// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { createUser, pool, resetDb, truncateAll } from './helpers'

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

/** 검수 대기 중인 상품 하나를 만든다. */
async function seedPendingProduct() {
  const sellerId = await createUser('판매자')
  const { rows } = await pool.query<{ id: string }>(
    `insert into products (seller_id, title, funding_project_name, category,
       condition_grade, photo_urls, backer_proof_url, start_price)
     values ($1, '상품', '펀딩', '만화', 'A', array['1','2','3'], 'proof', 10000)
     returning id`,
    [sellerId],
  )
  return rows[0].id
}

/** 회차를 만든다. 시작·마감 시각을 지금 기준 상대 초로 준다. */
async function seedDrop(startsInSeconds: number, endsInSeconds: number) {
  const { rows } = await pool.query<{ id: string }>(
    `insert into drops (round_number, starts_at, ends_at)
     values ((select coalesce(max(round_number), 0) + 1 from drops),
             now() + make_interval(secs => $1), now() + make_interval(secs => $2))
     returning id`,
    [startsInSeconds, endsInSeconds],
  )
  return rows[0].id
}

async function productStatus(productId: string) {
  const { rows } = await pool.query<{ status: string; rejection_reason: string | null }>(
    `select status, rejection_reason from products where id = $1`,
    [productId],
  )
  return rows[0]
}

describe('검수 승인', () => {
  test('승인하면 상품이 scheduled 가 되고 경매가 생긴다', async () => {
    const productId = await seedPendingProduct()
    const dropId = await seedDrop(60, 3600)

    const { rows } = await pool.query<{ approve_product: string }>(
      `select approve_product($1, $2)`,
      [productId, dropId],
    )

    expect((await productStatus(productId)).status).toBe('scheduled')
    const { rows: auction } = await pool.query<{
      status: string
      current_price: number
      drop_id: string
    }>(`select status, current_price, drop_id from auctions where id = $1`, [
      rows[0].approve_product,
    ])
    expect(auction[0]).toEqual({ status: 'scheduled', current_price: 10000, drop_id: dropId })
  })

  test('경매 마감 시각은 회차 마감 시각으로 맞춘다', async () => {
    const productId = await seedPendingProduct()
    const dropId = await seedDrop(60, 3600)

    await pool.query(`select approve_product($1, $2)`, [productId, dropId])

    const { rows } = await pool.query<{ same: boolean }>(
      `select a.ends_at = d.ends_at as same from auctions a join drops d on d.id = a.drop_id`,
    )
    expect(rows[0].same).toBe(true)
  })

  test('이미 마감된 회차에는 배정을 거부한다', async () => {
    // PRD 엣지케이스. check 제약으로는 막을 수 없어 함수에서 막는다.
    const productId = await seedPendingProduct()
    const dropId = await seedDrop(-3600, -60)

    await expect(pool.query(`select approve_product($1, $2)`, [productId, dropId])).rejects.toThrow(
      /이미 마감된 회차/,
    )
    expect((await productStatus(productId)).status).toBe('pending')
  })

  test('검수 대기 상태가 아니면 거부한다', async () => {
    const productId = await seedPendingProduct()
    const dropId = await seedDrop(60, 3600)
    await pool.query(`select approve_product($1, $2)`, [productId, dropId])

    const other = await seedDrop(60, 3600)
    await expect(pool.query(`select approve_product($1, $2)`, [productId, other])).rejects.toThrow(
      /검수 대기 상태가 아니다/,
    )
  })
})

describe('검수 반려', () => {
  test('반려하면 사유와 함께 기록된다', async () => {
    const productId = await seedPendingProduct()

    await pool.query(`select reject_product($1, $2)`, [productId, '후원 인증 이미지가 흐립니다'])

    expect(await productStatus(productId)).toEqual({
      status: 'rejected',
      rejection_reason: '후원 인증 이미지가 흐립니다',
    })
  })

  test('사유 없이 반려할 수 없다', async () => {
    const productId = await seedPendingProduct()

    await expect(pool.query(`select reject_product($1, $2)`, [productId, '   '])).rejects.toThrow(
      /반려 사유/,
    )
    expect((await productStatus(productId)).status).toBe('pending')
  })
})

describe('드롭 시작 — scheduled 를 live 로', () => {
  test('시작 시각이 되면 live 가 된다', async () => {
    const productId = await seedPendingProduct()
    const dropId = await seedDrop(-60, 3600)
    await pool.query(`select approve_product($1, $2)`, [productId, dropId])

    const { rows } = await pool.query(`select * from start_due_drops()`)

    expect(rows).toHaveLength(1)
    const { rows: auction } = await pool.query<{ status: string }>(`select status from auctions`)
    expect(auction[0].status).toBe('live')
  })

  test('시작 시각 전이면 건드리지 않는다', async () => {
    const productId = await seedPendingProduct()
    const dropId = await seedDrop(60, 3600)
    await pool.query(`select approve_product($1, $2)`, [productId, dropId])

    const { rows } = await pool.query(`select * from start_due_drops()`)

    expect(rows).toHaveLength(0)
    const { rows: auction } = await pool.query<{ status: string }>(`select status from auctions`)
    expect(auction[0].status).toBe('scheduled')
  })

  test('두 번 돌려도 한 번만 처리한다', async () => {
    const productId = await seedPendingProduct()
    const dropId = await seedDrop(-60, 3600)
    await pool.query(`select approve_product($1, $2)`, [productId, dropId])

    const first = await pool.query(`select * from start_due_drops()`)
    const second = await pool.query(`select * from start_due_drops()`)

    expect(first.rows).toHaveLength(1)
    expect(second.rows).toHaveLength(0)
  })

  test('스케줄러 실행 기록에 시작 건수가 남는다', async () => {
    const productId = await seedPendingProduct()
    const dropId = await seedDrop(-60, 3600)
    await pool.query(`select approve_product($1, $2)`, [productId, dropId])

    const { rows } = await pool.query<{ processed: number; detail: Record<string, number> }>(
      `select processed, detail from run_close_due_auctions()`,
    )

    expect(rows[0].processed).toBe(1)
    expect(rows[0].detail).toEqual({ started: 1 })
  })
})

describe('운영자 함수 권한', () => {
  test.each(['anon', 'authenticated'])('%s 는 검수 함수를 부를 수 없다', async (role) => {
    const productId = await seedPendingProduct()
    const dropId = await seedDrop(60, 3600)
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(`set local role ${role}`)
      await expect(
        client.query(`select approve_product($1, $2)`, [productId, dropId]),
      ).rejects.toThrow()
    } finally {
      await client.query('rollback').catch(() => {})
      client.release()
    }
  })
})

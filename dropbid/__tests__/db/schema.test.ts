// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { createUser, isRejected, pool, resetDb, seedLiveAuction, truncateAll } from './helpers'

beforeAll(async () => {
  await resetDb()
})
beforeEach(async () => {
  await truncateAll()
})
afterAll(async () => {
  await pool.end()
})

const PRODUCT_COLUMNS = `(seller_id, title, funding_project_name, category,
   condition_grade, photo_urls, backer_proof_url, start_price)`

describe('products — 등록 규칙을 스키마가 막는다', () => {
  test('사진이 3장 미만이면 거부한다', async () => {
    const sellerId = await createUser('판매자')
    expect(
      await isRejected(
        `insert into products ${PRODUCT_COLUMNS}
         values ($1,'상품','펀딩','만화','A',array['1','2'],'proof',10000)`,
        [sellerId],
      ),
    ).toBe(true)
  })

  test('후원 인증 이미지가 없으면 거부한다', async () => {
    const sellerId = await createUser('판매자')
    expect(
      await isRejected(
        `insert into products (seller_id, title, funding_project_name, category,
           condition_grade, photo_urls, start_price)
         values ($1,'상품','펀딩','만화','A',array['1','2','3'],10000)`,
        [sellerId],
      ),
    ).toBe(true)
  })

  test('시작가가 1,000원 미만이면 거부한다', async () => {
    const sellerId = await createUser('판매자')
    expect(
      await isRejected(
        `insert into products ${PRODUCT_COLUMNS}
         values ($1,'상품','펀딩','만화','A',array['1','2','3'],'proof',999)`,
        [sellerId],
      ),
    ).toBe(true)
  })

  test('반려인데 사유가 없으면 거부한다', async () => {
    const sellerId = await createUser('판매자')
    expect(
      await isRejected(
        `insert into products (seller_id, title, funding_project_name, category,
           condition_grade, photo_urls, backer_proof_url, start_price, status)
         values ($1,'상품','펀딩','만화','A',array['1','2','3'],'proof',10000,'rejected')`,
        [sellerId],
      ),
    ).toBe(true)
  })

  test('정상 등록은 pending 으로 들어간다', async () => {
    const sellerId = await createUser('판매자')
    const { rows } = await pool.query<{ status: string }>(
      `insert into products ${PRODUCT_COLUMNS}
       values ($1,'상품','펀딩','만화','A',array['1','2','3'],'proof',1000)
       returning status`,
      [sellerId],
    )
    expect(rows[0].status).toBe('pending')
  })
})

describe('auctions — 경매 상태 규칙', () => {
  test('연장 횟수가 20회를 넘으면 거부한다', async () => {
    const { auctionId } = await seedLiveAuction()
    expect(
      await isRejected(`update auctions set extension_count = 21 where id = $1`, [auctionId]),
    ).toBe(true)
  })

  test('낙찰인데 낙찰자가 없으면 거부한다', async () => {
    const { auctionId } = await seedLiveAuction()
    expect(await isRejected(`update auctions set status = 'sold' where id = $1`, [auctionId])).toBe(
      true,
    )
  })

  test('유찰인데 낙찰자가 있으면 거부한다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidderId = await createUser('입찰자')
    expect(
      await isRejected(`update auctions set status='unsold', winner_id=$2 where id = $1`, [
        auctionId,
        bidderId,
      ]),
    ).toBe(true)
  })

  test('같은 상품을 두 번 출품할 수 없다', async () => {
    const { auctionId, productId } = await seedLiveAuction()
    const { rows } = await pool.query<{ drop_id: string; ends_at: Date }>(
      `select drop_id, ends_at from auctions where id = $1`,
      [auctionId],
    )
    expect(
      await isRejected(
        `insert into auctions (product_id, drop_id, current_price, ends_at)
         values ($1, $2, 10000, $3)`,
        [productId, rows[0].drop_id, rows[0].ends_at],
      ),
    ).toBe(true)
  })
})

describe('bids — 사유 코드와 결과가 어긋나면 막는다', () => {
  test('거부인데 사유가 없으면 막는다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidderId = await createUser('입찰자')
    expect(
      await isRejected(
        `insert into bids (auction_id, bidder_id, amount, outcome)
         values ($1, $2, 11000, 'rejected')`,
        [auctionId, bidderId],
      ),
    ).toBe(true)
  })

  test('성공인데 사유가 붙어 있으면 막는다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidderId = await createUser('입찰자')
    expect(
      await isRejected(
        `insert into bids (auction_id, bidder_id, amount, outcome, reject_reason)
         values ($1, $2, 11000, 'accepted', 'not_live')`,
        [auctionId, bidderId],
      ),
    ).toBe(true)
  })

  test('정의되지 않은 사유 코드는 막는다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidderId = await createUser('입찰자')
    expect(
      await isRejected(
        `insert into bids (auction_id, bidder_id, amount, outcome, reject_reason)
         values ($1, $2, 11000, 'rejected', '오타난사유')`,
        [auctionId, bidderId],
      ),
    ).toBe(true)
  })
})

describe('알림 멱등 — 같은 알림은 두 번 들어가지 않는다', () => {
  test('같은 (경매, 수신자, 종류, 채널) 은 한 번만', async () => {
    const { auctionId } = await seedLiveAuction()
    const userId = await createUser('낙찰자')
    const insert = `insert into notifications (auction_id, user_id, kind, channel, status)
                    values ($1, $2, 'won', 'alimtalk', 'sent')`
    await pool.query(insert, [auctionId, userId])
    expect(await isRejected(insert, [auctionId, userId])).toBe(true)
  })

  test('알림톡이 실패하면 이메일 폴백은 들어간다', async () => {
    const { auctionId } = await seedLiveAuction()
    const userId = await createUser('낙찰자')
    await pool.query(
      `insert into notifications (auction_id, user_id, kind, channel, status, error)
       values ($1, $2, 'won', 'alimtalk', 'failed', '알림톡 오류')`,
      [auctionId, userId],
    )
    await pool.query(
      `insert into notifications (auction_id, user_id, kind, channel, status)
       values ($1, $2, 'won', 'email', 'sent')`,
      [auctionId, userId],
    )
    const { rows } = await pool.query<{ count: string }>(
      `select count(*)::text as count from notifications where auction_id = $1`,
      [auctionId],
    )
    expect(rows[0].count).toBe('2')
  })

  test('실패인데 사유가 없으면 막는다', async () => {
    const { auctionId } = await seedLiveAuction()
    const userId = await createUser('낙찰자')
    expect(
      await isRejected(
        `insert into notifications (auction_id, user_id, kind, channel, status)
         values ($1, $2, 'won', 'alimtalk', 'failed')`,
        [auctionId, userId],
      ),
    ).toBe(true)
  })
})

describe('계정 삭제 — 기록은 남고 사람만 지운다', () => {
  test('입찰자를 지워도 입찰 기록은 익명으로 남는다', async () => {
    const { auctionId } = await seedLiveAuction()
    const bidderId = await createUser('입찰자')
    await pool.query(
      `insert into bids (auction_id, bidder_id, amount, outcome)
       values ($1, $2, 11000, 'accepted')`,
      [auctionId, bidderId],
    )

    await pool.query(`delete from auth.users where id = $1`, [bidderId])

    const { rows } = await pool.query<{ count: string; bidder_id: string | null }>(
      `select count(*)::text as count, max(bidder_id::text) as bidder_id from bids`,
    )
    expect(rows[0].count).toBe('1')
    expect(rows[0].bidder_id).toBeNull()
  })
})

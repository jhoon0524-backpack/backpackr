// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { createUser, isRejected, pool, resetDb, seedCommission, submit, truncateAll } from './helpers'

beforeAll(async () => { await resetDb() })
beforeEach(async () => { await truncateAll() })
afterAll(async () => { await pool.end() })

describe('commissions 제약', () => {
  test('가격은 1,000원 이상, 작업 기간은 1~90일, 슬롯은 1~20', async () => {
    const creatorId = await createUser('창작자')
    const insert = (price: number, days: number, slots: number) =>
      isRejected(
        `insert into commissions (creator_id, title, description, category, price, turnaround_days, max_slots)
         values ($1, '제목', '설명', '일러스트', $2, $3, $4)`,
        [creatorId, price, days, slots],
      )
    expect(await insert(999, 7, 1)).toBe(true)
    expect(await insert(1000, 0, 1)).toBe(true)
    expect(await insert(1000, 91, 1)).toBe(true)
    expect(await insert(1000, 7, 0)).toBe(true)
    expect(await insert(1000, 7, 21)).toBe(true)
    expect(await insert(1000, 7, 1)).toBe(false)
  })

  test('정해진 카테고리 밖은 거부', async () => {
    const creatorId = await createUser('창작자')
    expect(await isRejected(
      `insert into commissions (creator_id, title, description, category, price, turnaround_days, max_slots)
       values ($1, '제목', '설명', '없는 분류', 1000, 7, 1)`, [creatorId],
    )).toBe(true)
  })
})

describe('requests 제약', () => {
  test('의뢰 내용은 10자 이상', async () => {
    const { commissionId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    // 함수가 아니라 check 제약이 막는다. 함수는 예외를 그대로 올린다 (화면은 그 전에 거른다).
    expect(await isRejected(`select submit_request($1, $2, '짧음', null)`, [commissionId, clientId])).toBe(true)
  })

  test('거절에는 사유가 있어야 한다', async () => {
    const { commissionId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    const r = await submit(commissionId, clientId)
    expect(await isRejected(`update requests set status = 'declined' where id = $1`, [r.request_id])).toBe(true)
  })

  test('수락 상태에는 최종가와 마감일이 있어야 한다', async () => {
    const { commissionId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    const r = await submit(commissionId, clientId)
    expect(await isRejected(`update requests set status = 'accepted' where id = $1`, [r.request_id])).toBe(true)
  })

  test('같은 사람이 같은 커미션에 대기 의뢰를 둘 쌓지 못한다', async () => {
    const { commissionId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    await submit(commissionId, clientId)
    // 함수는 already_requested 로 거르지만, 함수를 우회해도 인덱스가 막는다.
    expect(await isRejected(
      `insert into requests (commission_id, client_id, brief, quoted_price)
       values ($1, $2, '열 글자는 넘는 의뢰 내용입니다', 1000)`, [commissionId, clientId],
    )).toBe(true)
  })
})

// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { pool as appPool, updateCommission } from '@/lib/db'
import { call, createUser, pool, resetDb, seedCommission, submit, truncateAll } from './helpers'

beforeAll(async () => { await resetDb() })
beforeEach(async () => { await truncateAll() })
afterAll(async () => { await Promise.all([pool.end(), appPool.end()]) })

const CHANGED = {
  title: '고친 제목', description: '고친 설명', category: '일러스트',
  price: 70000, turnaroundDays: 20, maxSlots: 2, sampleUrls: ['sample-1'],
}

describe('updateCommission', () => {
  test('본인 메뉴는 고쳐지고, 주소(id)는 그대로다', async () => {
    const { commissionId, creatorId } = await seedCommission({ price: 50000, maxSlots: 3 })
    expect(await updateCommission(commissionId, creatorId, CHANGED)).toEqual({ ok: true })

    const { rows } = await pool.query(
      `select id, title, price, turnaround_days, max_slots from commissions where id = $1`, [commissionId],
    )
    expect(rows[0]).toMatchObject({ id: commissionId, title: '고친 제목', price: 70000, turnaround_days: 20, max_slots: 2 })
  })

  test('남의 메뉴와 없는 메뉴는 not_mine', async () => {
    const { commissionId } = await seedCommission()
    const stranger = await createUser('행인')
    expect(await updateCommission(commissionId, stranger, CHANGED)).toEqual({ ok: false, reason: 'not_mine' })
    expect(await updateCommission('00000000-0000-0000-0000-000000000000', stranger, CHANGED))
      .toEqual({ ok: false, reason: 'not_mine' })
    // uuid 꼴이 아닌 주소로 들어와도 예외를 던지지 않는다
    expect(await updateCommission('abc', stranger, CHANGED)).toEqual({ ok: false, reason: 'not_mine' })
  })

  test('동시 진행 건수를 지금 진행 중인 건수보다 작게는 못 줄인다', async () => {
    const { commissionId, creatorId } = await seedCommission({ maxSlots: 3 })
    for (const name of ['A', 'B']) {
      const r = await submit(commissionId, await createUser(name))
      await call('accept_request', [r.request_id, creatorId, 50000])
    }
    // 진행 2건 → 1로 줄이기는 거부, 2로 줄이기는 허용
    expect(await updateCommission(commissionId, creatorId, { ...CHANGED, maxSlots: 1 }))
      .toEqual({ ok: false, reason: 'slots_too_low', active: 2 })
    expect(await updateCommission(commissionId, creatorId, { ...CHANGED, maxSlots: 2 })).toEqual({ ok: true })
  })

  test('메뉴를 고쳐도 이미 들어온 의뢰의 금액과 마감일은 그대로다', async () => {
    const { commissionId, creatorId } = await seedCommission({ price: 50000, turnaroundDays: 7, maxSlots: 3 })
    const waiting = await submit(commissionId, await createUser('대기'))
    const working = await submit(commissionId, await createUser('진행'))
    await call('accept_request', [working.request_id, creatorId, 55000])

    const before = await pool.query(
      `select id, quoted_price, final_price, due_at from requests order by created_at`,
    )
    expect(await updateCommission(commissionId, creatorId, { ...CHANGED, price: 90000, turnaroundDays: 60 }))
      .toEqual({ ok: true })
    const after = await pool.query(
      `select id, quoted_price, final_price, due_at from requests order by created_at`,
    )
    expect(after.rows).toEqual(before.rows)
    // 대기 의뢰는 의뢰 시점 가격을, 수락된 의뢰는 확정된 최종가를 그대로 들고 있다
    expect(after.rows.find((r) => r.id === waiting.request_id)?.quoted_price).toBe(50000)
    expect(after.rows.find((r) => r.id === working.request_id)?.final_price).toBe(55000)
  })
})

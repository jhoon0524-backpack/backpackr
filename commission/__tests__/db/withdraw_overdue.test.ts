// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { call, createUser, pool, resetDb, seedCommission, status, submit, truncateAll } from './helpers'

beforeAll(async () => { await resetDb() })
beforeEach(async () => { await truncateAll() })
afterAll(async () => { await pool.end() })

/**
 * 수락된 의뢰의 마감일을 과거로 민다.
 *
 * 시계를 기다릴 수는 없으니 데이터를 옮긴다. 테스트가 `now()` 를 흉내 내면
 * 함수 안의 `now()` 와 서로 다른 시각을 보게 되어, 통과해도 참이 아니다.
 */
async function pushDueBack(requestId: string, days: number) {
  await pool.query(`update requests set due_at = now() - make_interval(days => $2) where id = $1`, [requestId, days])
}

/** 창작자가 수락한 의뢰 한 건을 만든다. */
async function accepted(maxSlots = 2) {
  const { commissionId, creatorId } = await seedCommission({ maxSlots })
  const clientId = await createUser('의뢰인')
  const r = await submit(commissionId, clientId)
  await call('accept_request', [r.request_id!, creatorId, 50000])
  return { commissionId, creatorId, clientId, requestId: r.request_id! }
}

async function activeCount(commissionId: string) {
  const { rows } = await pool.query<{ n: number }>(`select active_request_count($1) as n`, [commissionId])
  return rows[0].n
}

/** 유예 기간은 DB 가 정한다. 테스트가 3 을 손으로 적으면 나중에 수를 바꿀 때 여기가 거짓말을 한다. */
async function graceDays() {
  const { rows } = await pool.query<{ d: number }>(`select withdraw_grace_days() as d`)
  return rows[0].d
}

describe('마감이 지난 의뢰를 의뢰인이 물린다', () => {
  test('마감 + 유예가 지나면 물릴 수 있고, 자리가 빈다', async () => {
    const { commissionId, clientId, requestId } = await accepted()
    expect(await activeCount(commissionId)).toBe(1)

    await pushDueBack(requestId, (await graceDays()) + 1)
    expect(await call('cancel_request', [requestId, clientId])).toMatchObject({ outcome: 'accepted' })

    expect(await status(requestId)).toBe('cancelled')
    expect(await activeCount(commissionId)).toBe(0)
  })

  test('마감은 지났지만 유예가 안 지났으면 못 물린다', async () => {
    const { clientId, requestId } = await accepted()
    await pushDueBack(requestId, (await graceDays()) - 1)
    expect(await call('cancel_request', [requestId, clientId])).toMatchObject({ reject_reason: 'too_early' })
    expect(await status(requestId)).toBe('accepted')
  })

  test('마감 전에는 못 물린다', async () => {
    const { clientId, requestId } = await accepted()
    expect(await call('cancel_request', [requestId, clientId])).toMatchObject({ reject_reason: 'too_early' })
    expect(await status(requestId)).toBe('accepted')
  })

  test('전달된 뒤에는 못 물린다 — 받을 것은 이미 왔다', async () => {
    const { creatorId, clientId, requestId } = await accepted()
    await call('deliver_request', [requestId, creatorId, 'https://example.com/a.png', null])
    await pushDueBack(requestId, (await graceDays()) + 1)
    expect(await call('cancel_request', [requestId, clientId])).toMatchObject({ reject_reason: 'not_pending' })
    expect(await status(requestId)).toBe('delivered')
  })

  test('남의 의뢰는 물리지 못한다', async () => {
    const { requestId } = await accepted()
    const other = await createUser('남')
    await pushDueBack(requestId, (await graceDays()) + 1)
    await expect(call('cancel_request', [requestId, other])).rejects.toThrow()
  })

  test('창작자는 자기가 수락한 의뢰를 물리지 못한다 — 물리기는 의뢰인의 것이다', async () => {
    const { creatorId, requestId } = await accepted()
    await pushDueBack(requestId, (await graceDays()) + 1)
    await expect(call('cancel_request', [requestId, creatorId])).rejects.toThrow()
  })

  test('자리가 비면 다른 사람이 그 자리에 의뢰를 넣을 수 있다', async () => {
    const { commissionId, clientId, requestId } = await accepted(1)
    const next = await createUser('다음 사람')
    expect(await submit(commissionId, next)).toMatchObject({ reject_reason: 'slots_full' })

    await pushDueBack(requestId, (await graceDays()) + 1)
    await call('cancel_request', [requestId, clientId])

    expect(await submit(commissionId, next)).toMatchObject({ outcome: 'accepted' })
  })
})

describe('수락 전 취소는 그대로다', () => {
  test('의뢰인은 수락 전에 언제든 거둔다', async () => {
    const { commissionId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    const r = await submit(commissionId, clientId)
    expect(await call('cancel_request', [r.request_id!, clientId])).toMatchObject({ outcome: 'accepted' })
    expect(await status(r.request_id!)).toBe('cancelled')
  })

  test('이미 끝난 의뢰는 못 물린다', async () => {
    const { creatorId, clientId, requestId } = await accepted()
    await call('deliver_request', [requestId, creatorId, 'https://example.com/a.png', null])
    await call('complete_request', [requestId, clientId])
    expect(await call('cancel_request', [requestId, clientId])).toMatchObject({ reject_reason: 'not_pending' })
  })
})

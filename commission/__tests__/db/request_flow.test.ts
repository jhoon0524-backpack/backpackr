// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { call, createUser, pool, resetDb, seedCommission, status, submit, truncateAll } from './helpers'

beforeAll(async () => { await resetDb() })
beforeEach(async () => { await truncateAll() })
afterAll(async () => { await pool.end() })

describe('submit_request 거부 규칙', () => {
  test('닫힌 커미션', async () => {
    const { commissionId } = await seedCommission({ status: 'closed' })
    const clientId = await createUser('의뢰인')
    expect(await submit(commissionId, clientId)).toMatchObject({ outcome: 'rejected', reject_reason: 'closed' })
  })

  test('내 커미션에 내가 의뢰', async () => {
    const { commissionId, creatorId } = await seedCommission()
    expect(await submit(commissionId, creatorId)).toMatchObject({ reject_reason: 'own_commission' })
  })

  test('슬롯이 꽉 차면 새 의뢰를 받지 않는다', async () => {
    const { commissionId, creatorId } = await seedCommission({ maxSlots: 1 })
    const a = await createUser('A')
    const b = await createUser('B')
    const r = await submit(commissionId, a)
    expect(await call('accept_request', [r.request_id, creatorId, 50000])).toMatchObject({ outcome: 'accepted' })
    expect(await submit(commissionId, b)).toMatchObject({ reject_reason: 'slots_full' })
  })

  test('대기 중 의뢰가 있으면 또 넣지 못한다', async () => {
    const { commissionId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    expect(await submit(commissionId, clientId)).toMatchObject({ outcome: 'accepted' })
    expect(await submit(commissionId, clientId)).toMatchObject({ reject_reason: 'already_requested' })
  })

  test('의뢰 시점의 기본가가 quoted_price 로 남는다', async () => {
    const { commissionId } = await seedCommission({ price: 77000 })
    const clientId = await createUser('의뢰인')
    const r = await submit(commissionId, clientId)
    const { rows } = await pool.query(`select quoted_price from requests where id = $1`, [r.request_id])
    expect(rows[0].quoted_price).toBe(77000)
  })
})

describe('정상 흐름: 의뢰 → 수락 → 전달 → 완료', () => {
  test('상태가 순서대로 바뀌고 마감일은 수락일 + 작업 기간', async () => {
    const { commissionId, creatorId } = await seedCommission({ turnaroundDays: 10 })
    const clientId = await createUser('의뢰인')
    const r = await submit(commissionId, clientId)
    const id = r.request_id!

    const accepted = await call('accept_request', [id, creatorId, 55000])
    expect(accepted).toMatchObject({ outcome: 'accepted', final_price: 55000 })
    expect(await status(id)).toBe('accepted')
    const { rows } = await pool.query(
      `select (due_at::date - accepted_at::date) as days from requests where id = $1`, [id],
    )
    expect(rows[0].days).toBe(10)

    expect(await call('deliver_request', [id, creatorId, 'https://example.com/final.png', null]))
      .toMatchObject({ outcome: 'accepted' })
    expect(await status(id)).toBe('delivered')

    expect(await call('complete_request', [id, clientId])).toMatchObject({ outcome: 'accepted' })
    expect(await status(id)).toBe('completed')
  })

  test('완료되면 슬롯이 비어 다음 의뢰를 받는다', async () => {
    const { commissionId, creatorId } = await seedCommission({ maxSlots: 1 })
    const a = await createUser('A')
    const b = await createUser('B')
    const r = await submit(commissionId, a)
    await call('accept_request', [r.request_id, creatorId, 50000])
    expect(await submit(commissionId, b)).toMatchObject({ reject_reason: 'slots_full' })

    await call('deliver_request', [r.request_id, creatorId, null, '메일로 보냈습니다'])
    // 전달만으로는 슬롯이 안 빈다. 의뢰인이 확정해야 끝난 것이다.
    expect(await submit(commissionId, b)).toMatchObject({ reject_reason: 'slots_full' })
    await call('complete_request', [r.request_id, a])
    expect(await submit(commissionId, b)).toMatchObject({ outcome: 'accepted' })
  })
})

describe('갈림길', () => {
  test('거절: 사유 필수, 거절 뒤에는 수락 불가', async () => {
    const { commissionId, creatorId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    const r = await submit(commissionId, clientId)
    expect(await call('decline_request', [r.request_id, creatorId, '  '])).toMatchObject({ reject_reason: 'reason_required' })
    expect(await call('decline_request', [r.request_id, creatorId, '이번 달 일정이 찼습니다'])).toMatchObject({ outcome: 'accepted' })
    expect(await status(r.request_id!)).toBe('declined')
    expect(await call('accept_request', [r.request_id, creatorId, 50000])).toMatchObject({ reject_reason: 'not_pending' })
  })

  // 규칙이 한 번 바뀐 자리다. 전에는 "수락되면 끝, 못 물린다" 였는데,
  // 그러면 창작자가 잠수했을 때 자리가 영영 안 비었다. 지금은 마감 + 유예가 지나면 열린다.
  // 유예가 지난 쪽은 `withdraw_overdue.test.ts` 가 따로 본다.
  test('의뢰인 취소는 수락 전까지 자유롭고, 수락 뒤에는 마감을 기다려야 한다', async () => {
    const { commissionId, creatorId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    const r1 = await submit(commissionId, clientId)
    expect(await call('cancel_request', [r1.request_id, clientId])).toMatchObject({ outcome: 'accepted' })
    expect(await status(r1.request_id!)).toBe('cancelled')

    const r2 = await submit(commissionId, clientId)
    await call('accept_request', [r2.request_id, creatorId, 50000])
    expect(await call('cancel_request', [r2.request_id, clientId])).toMatchObject({ reject_reason: 'too_early' })
    expect(await status(r2.request_id!)).toBe('accepted')
  })

  test('전달에는 주소나 메모 중 하나가 있어야 한다', async () => {
    const { commissionId, creatorId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    const r = await submit(commissionId, clientId)
    await call('accept_request', [r.request_id, creatorId, 50000])
    expect(await call('deliver_request', [r.request_id, creatorId, ' ', ''])).toMatchObject({ reject_reason: 'payload_required' })
  })

  test('전달 전에는 완료할 수 없다', async () => {
    const { commissionId, creatorId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    const r = await submit(commissionId, clientId)
    await call('accept_request', [r.request_id, creatorId, 50000])
    expect(await call('complete_request', [r.request_id, clientId])).toMatchObject({ reject_reason: 'not_delivered' })
  })

  test('남의 의뢰·남의 커미션은 예외로 막는다', async () => {
    const { commissionId, creatorId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    const stranger = await createUser('행인')
    const r = await submit(commissionId, clientId)
    await expect(call('accept_request', [r.request_id, stranger, 50000])).rejects.toThrow()
    await expect(call('decline_request', [r.request_id, stranger, '사유'])).rejects.toThrow()
    await expect(call('cancel_request', [r.request_id, stranger])).rejects.toThrow()
    await call('accept_request', [r.request_id, creatorId, 50000])
    await expect(call('deliver_request', [r.request_id, stranger, 'u', null])).rejects.toThrow()
    await call('deliver_request', [r.request_id, creatorId, 'u', null])
    await expect(call('complete_request', [r.request_id, stranger])).rejects.toThrow()
  })
})

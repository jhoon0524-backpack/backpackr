// @vitest-environment node
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { call, createUser, pool, resetDb, seedCommission, submit, truncateAll } from './helpers'

beforeAll(async () => { await resetDb() })
beforeEach(async () => { await truncateAll() })
afterAll(async () => { await pool.end() })

// 인수 조건: 슬롯이 2개인 커미션에 대기 의뢰 20건을 동시에 수락해도 정확히 2건만 수락된다.
// 수락 함수가 커미션 행을 잠그지 않으면 각 트랜잭션이 "아직 0건" 을 보고 전부 통과한다.
test('동시 수락 20건 중 슬롯 수(2)만큼만 성공한다', async () => {
  const { commissionId, creatorId } = await seedCommission({ maxSlots: 2 })
  const requestIds: string[] = []
  for (let i = 0; i < 20; i++) {
    const clientId = await createUser(`의뢰인${i}`)
    const r = await submit(commissionId, clientId)
    requestIds.push(r.request_id!)
  }

  const results = await Promise.all(
    requestIds.map((id) => call('accept_request', [id, creatorId, 50000])),
  )
  const accepted = results.filter((r) => r.outcome === 'accepted')
  const full = results.filter((r) => r.reject_reason === 'slots_full')
  expect(accepted).toHaveLength(2)
  expect(full).toHaveLength(18)

  const { rows } = await pool.query(`select active_request_count($1) as n`, [commissionId])
  expect(rows[0].n).toBe(2)
})

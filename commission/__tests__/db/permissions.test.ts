// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { createUser, pool, resetDb, seedCommission, submit, truncateAll } from './helpers'

beforeAll(async () => { await resetDb() })
beforeEach(async () => { await truncateAll() })
afterAll(async () => { await pool.end() })

/** 브라우저 키 역할로 한 문장을 실행해 본다. 권한이 막으면 true. */
async function deniedAs(role: string, sql: string, params: unknown[] = []) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(`set local role ${role}`)
    try {
      await client.query(sql, params)
      return false
    } catch (e) {
      return /permission denied/.test((e as Error).message)
    } finally {
      await client.query('rollback')
    }
  } finally {
    client.release()
  }
}

describe('브라우저 역할은 의뢰에 직접 쓰지 못한다', () => {
  test('anon / authenticated 의 insert·update 는 거부', async () => {
    const { commissionId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    const r = await submit(commissionId, clientId)
    for (const role of ['anon', 'authenticated']) {
      expect(await deniedAs(role,
        `insert into requests (commission_id, client_id, brief, quoted_price) values ($1, $2, '열 글자는 넘는 의뢰 내용', 1000)`,
        [commissionId, clientId])).toBe(true)
      expect(await deniedAs(role, `update requests set status = 'cancelled' where id = $1`, [r.request_id])).toBe(true)
      expect(await deniedAs(role, `update commissions set price = 1 where id = $1`, [commissionId])).toBe(true)
    }
  })

  test('상태 함수는 service_role 만 부른다', async () => {
    const { commissionId } = await seedCommission()
    const clientId = await createUser('의뢰인')
    for (const role of ['anon', 'authenticated']) {
      expect(await deniedAs(role, `select submit_request($1, $2, '열 글자는 넘는 의뢰 내용', null)`, [commissionId, clientId])).toBe(true)
    }
    expect(await deniedAs('service_role', `select submit_request($1, $2, '열 글자는 넘는 의뢰 내용', null)`, [commissionId, clientId])).toBe(false)
  })

  test('남은 슬롯 계산은 누구나 읽는다', async () => {
    const { commissionId } = await seedCommission()
    expect(await deniedAs('anon', `select active_request_count($1)`, [commissionId])).toBe(false)
  })
})

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { Pool } from 'pg'

const DEFAULT_URL = 'postgresql://commission:commission@127.0.0.1:5432/commission_dev'
const DATABASE_URL = process.env.DATABASE_URL ?? DEFAULT_URL

// 이 하네스는 public 스키마를 통째로 지운다. 로컬이 아니면 아예 붙지 않는다.
// CLAUDE.md 4장 — 스키마 변경과 데이터 삭제는 사람 승인 없이 실행하지 않는다.
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(DATABASE_URL)) {
  throw new Error(`로컬이 아닌 DB 로 보인다. 테스트가 스키마를 지우므로 중단한다: ${DATABASE_URL}`)
}

const SUPABASE_DIR = join(import.meta.dirname, '..', '..', 'supabase')

export const pool = new Pool({ connectionString: DATABASE_URL, max: 25 })

/** 스키마를 비우고 마이그레이션을 순서대로 다시 적용한다. */
export async function resetDb() {
  const files = [
    join(SUPABASE_DIR, 'local', 'bootstrap.sql'),
    ...readdirSync(join(SUPABASE_DIR, 'migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => join(SUPABASE_DIR, 'migrations', f)),
  ]
  for (const file of files) {
    await pool.query(readFileSync(file, 'utf8'))
  }
}

/** 테이블 내용만 비운다. 스키마는 그대로 둔다. */
export async function truncateAll() {
  await pool.query(`truncate requests, commissions, profiles cascade; delete from auth.users;`)
}

/** 사용자 한 명을 만들고 id 를 돌려준다. auth.users 와 profiles 를 함께 채운다. */
export async function createUser(nickname: string) {
  const { rows } = await pool.query<{ id: string }>(
    `with u as (insert into auth.users (id) values (gen_random_uuid()) returning id)
     insert into profiles (id, nickname) select id, $1 from u returning id`,
    [nickname],
  )
  return rows[0].id
}

/** 창작자와 열린 커미션을 한 번에 만든다. 대부분의 테스트가 여기서 시작한다. */
export async function seedCommission(opts: { maxSlots?: number; price?: number; turnaroundDays?: number; status?: string } = {}) {
  const creatorId = await createUser('창작자')
  const { rows } = await pool.query<{ id: string }>(
    `insert into commissions (creator_id, title, description, category, price, turnaround_days, max_slots, status)
     values ($1, '반신 일러스트', '설명', '일러스트', $2, $3, $4, $5) returning id`,
    [creatorId, opts.price ?? 50000, opts.turnaroundDays ?? 7, opts.maxSlots ?? 2, opts.status ?? 'open'],
  )
  return { creatorId, commissionId: rows[0].id }
}

export type Outcome = { outcome: 'accepted' | 'rejected'; reject_reason: string | null; request_id?: string }

const BRIEF = '검은 단발 캐릭터를 카페 배경으로 그려 주세요.'

export async function submit(commissionId: string, clientId: string, brief = BRIEF) {
  const { rows } = await pool.query<{ r: Outcome }>(
    `select submit_request($1, $2, $3, null) as r`, [commissionId, clientId, brief],
  )
  return rows[0].r
}

export async function call(fn: string, args: unknown[]) {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(', ')
  const { rows } = await pool.query<{ r: Outcome }>(`select ${fn}(${placeholders}) as r`, args)
  return rows[0].r
}

export async function status(requestId: string) {
  const { rows } = await pool.query<{ status: string }>(`select status from requests where id = $1`, [requestId])
  return rows[0].status
}

/** insert 한 줄이 제약에 막히는지 본다. 막히면 true. */
export async function isRejected(sql: string, params: unknown[] = []) {
  try {
    await pool.query(sql, params)
    return false
  } catch {
    return true
  }
}

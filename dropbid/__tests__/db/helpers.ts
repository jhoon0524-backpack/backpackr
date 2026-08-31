import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { Pool } from 'pg'

const DEFAULT_URL = 'postgresql://dropbid:dropbid@127.0.0.1:5432/dropbid_dev'
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
  await pool.query(`
    truncate bids, orders, notifications, auctions, products, drops, profiles cascade;
    delete from auth.users;
  `)
}

/** 사용자 한 명을 만들고 id 를 돌려준다. auth.users 와 profiles 를 함께 채운다. */
export async function createUser(nickname: string, phone: string | null = '010-0000-0000') {
  const { rows } = await pool.query<{ id: string }>(
    `with u as (insert into auth.users (id) values (gen_random_uuid()) returning id)
     insert into profiles (id, nickname, phone) select id, $1, $2 from u returning id`,
    [nickname, phone],
  )
  return rows[0].id
}

/** 판매자·상품·회차·경매를 한 번에 만든다. 대부분의 테스트가 여기서 시작한다. */
export async function seedLiveAuction(opts: { startPrice?: number; endsInSeconds?: number } = {}) {
  const startPrice = opts.startPrice ?? 10000
  const endsIn = opts.endsInSeconds ?? 86400

  const sellerId = await createUser('판매자')
  const { rows } = await pool.query<{ auction_id: string; product_id: string }>(
    `with d as (
       insert into drops (round_number, starts_at, ends_at)
       values (1, now(), now() + make_interval(secs => $2)) returning id, ends_at
     ), p as (
       insert into products (seller_id, title, funding_project_name, category,
                             condition_grade, photo_urls, backer_proof_url, start_price)
       values ($1, '상품', '펀딩', '만화', 'A', array['1','2','3'], 'proof', $3)
       returning id
     )
     insert into auctions (product_id, drop_id, current_price, ends_at, status)
     select p.id, d.id, $3, d.ends_at, 'live' from p, d
     returning id as auction_id, product_id`,
    [sellerId, endsIn, startPrice],
  )
  return { sellerId, auctionId: rows[0].auction_id, productId: rows[0].product_id }
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

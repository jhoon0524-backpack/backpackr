/**
 * 로컬 데이터베이스 준비. 윈도우·맥·리눅스에서 똑같이 돈다.
 *
 *   node scripts/db.mjs setup    준비 전부 (역할·DB 생성 → 마이그레이션 → 시연 데이터)
 *   node scripts/db.mjs reset    비우고 마이그레이션만 다시
 *   node scripts/db.mjs seed     시연 데이터만 다시
 *
 * 예전에는 `sh` 와 `psql` 을 썼는데 윈도우에는 둘 다 없다. `pg` 로만 하도록 바꿨다.
 * SQL 파일은 통째로 한 번에 보낸다 — 문장 단위로 쪼개면 함수 본문($$ ... $$)이 깨진다.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const MIGRATIONS = join(ROOT, 'supabase', 'migrations')
const LOCAL = join(ROOT, 'supabase', 'local')

const APP_DB = 'dropbid_dev'
const APP_USER = 'dropbid'
const APP_PASSWORD = 'dropbid'

/** .env.local 을 읽는다. 앱은 Next 가 알아서 읽지만 이 스크립트는 직접 읽어야 한다. */
function readEnvLocal() {
  const file = join(ROOT, '.env.local')
  if (!existsSync(file)) return {}
  const out = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...readEnvLocal(), ...process.env }
const appUrl =
  env.DATABASE_URL ?? `postgresql://${APP_USER}:${APP_PASSWORD}@127.0.0.1:5432/${APP_DB}`

/** 이 스크립트는 스키마를 통째로 지운다. 로컬이 아니면 멈춘다 (CLAUDE.md 4장). */
function assertLocal(url) {
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    console.error('거부: 로컬이 아닌 데이터베이스로 보입니다. 이 명령은 데이터를 지웁니다.')
    console.error(`  대상: ${url.replace(/:[^:@/]*@/, ':****@')}`)
    process.exit(1)
  }
}

async function run(url, sql) {
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}

/** 관리자로 붙어 앱 전용 역할과 데이터베이스를 만든다. 이미 있으면 넘어간다. */
async function create() {
  const password = env.POSTGRES_PASSWORD
  if (!password) {
    console.error('POSTGRES_PASSWORD 가 없습니다.')
    console.error('.env.local 파일에 PostgreSQL 설치할 때 정한 비밀번호를 넣어 주세요:')
    console.error('  POSTGRES_PASSWORD=여기에비밀번호')
    process.exit(1)
  }
  const superUser = env.POSTGRES_USER ?? 'postgres'
  const adminUrl = `postgresql://${superUser}:${encodeURIComponent(password)}@127.0.0.1:5432/postgres`

  const client = new pg.Client({ connectionString: adminUrl })
  try {
    await client.connect()
  } catch (e) {
    console.error('PostgreSQL 에 연결하지 못했습니다.')
    console.error('  - PostgreSQL 이 켜져 있는지')
    console.error('  - .env.local 의 POSTGRES_PASSWORD 가 맞는지 확인해 주세요.')
    console.error(`  (원인: ${e.message})`)
    process.exit(1)
  }
  try {
    const role = await client.query(`select 1 from pg_roles where rolname = $1`, [APP_USER])
    if (role.rowCount === 0) {
      // 로컬 개발용 DB 다. bootstrap.sql 이 역할을 만들고 bypassrls 를 걸어야 해서
      // superuser 로 만든다. 이 역할은 이 컴퓨터 밖에서 쓰이지 않는다.
      await client.query(
        `create role ${APP_USER} login superuser password '${APP_PASSWORD}'`,
      )
      console.log(`  만듦  역할 ${APP_USER}`)
    } else {
      console.log(`  있음  역할 ${APP_USER}`)
    }

    const db = await client.query(`select 1 from pg_database where datname = $1`, [APP_DB])
    if (db.rowCount === 0) {
      await client.query(`create database ${APP_DB} owner ${APP_USER}`)
      console.log(`  만듦  데이터베이스 ${APP_DB}`)
    } else {
      console.log(`  있음  데이터베이스 ${APP_DB}`)
    }
  } finally {
    await client.end()
  }
}

async function reset() {
  assertLocal(appUrl)
  await run(appUrl, readFileSync(join(LOCAL, 'bootstrap.sql'), 'utf8'))
  console.log('  준비  bootstrap.sql')
  for (const name of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await run(appUrl, readFileSync(join(MIGRATIONS, name), 'utf8'))
    console.log(`  적용  ${name}`)
  }
}

async function seed() {
  assertLocal(appUrl)
  await run(appUrl, readFileSync(join(LOCAL, 'seed.sql'), 'utf8'))
  console.log('시연용 데이터 넣음')
}

const command = process.argv[2] ?? 'setup'
const steps = { create: [create], reset: [reset], seed: [seed], setup: [create, reset, seed] }
if (!steps[command]) {
  console.error(`모르는 명령: ${command} (setup | reset | seed | create)`)
  process.exit(1)
}
for (const step of steps[command]) await step()
console.log('완료')

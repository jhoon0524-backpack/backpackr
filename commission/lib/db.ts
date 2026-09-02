import { Pool } from 'pg'

// 서버에서만 쓴다. 브라우저 번들에 들어가면 안 된다.
// 의뢰 상태는 DB 함수(submit_request 등)로만 바꾼다 — 이 풀로 requests 에 직접 쓰지 않는다 (CLAUDE.md 규칙 목록).
declare global {
  var commissionPool: Pool | undefined
}

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://commission:commission@127.0.0.1:5432/commission_dev'

export const pool = global.commissionPool ?? new Pool({ connectionString })

// 개발 중 핫 리로드마다 풀이 새로 생기는 것을 막는다.
if (process.env.NODE_ENV !== 'production') global.commissionPool = pool

/** 주소로 들어온 id 가 uuid 꼴이 아니면 DB 가 오류를 던져 오류 화면이 뜬다. 그건 "없는 페이지" 다. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (s: string) => UUID.test(s)

export const CATEGORIES = ['일러스트', '캐릭터 디자인', '로고·타이포', '글·소설', '음악·사운드', '기타'] as const

export type CommissionCard = {
  id: string
  title: string
  category: string
  price: number
  turnaround_days: number
  max_slots: number
  active_count: number
  cover_url: string | null
  creator_nickname: string
  status: string
}

/** 열린 커미션을 최신순으로. 남은 슬롯은 화면에서 max_slots - active_count 로 계산한다. */
export async function listOpenCommissions(): Promise<CommissionCard[]> {
  const { rows } = await pool.query<CommissionCard>(`
    select c.id, c.title, c.category, c.price, c.turnaround_days, c.max_slots, c.status,
           active_request_count(c.id) as active_count,
           c.sample_urls[1] as cover_url,
           p.nickname as creator_nickname
      from commissions c
      join profiles p on p.id = c.creator_id
     where c.status = 'open'
     order by c.created_at desc
  `)
  return rows
}

export type CommissionDetail = CommissionCard & {
  creator_id: string
  description: string
  sample_urls: string[]
  creator_bio: string | null
  /** 자리가 꽉 찼을 때 가장 먼저 비는 시점(진행 중 의뢰의 가장 이른 마감일). 진행 중이 없으면 null. */
  next_free_at: Date | null
}

export async function getCommission(id: string): Promise<CommissionDetail | null> {
  if (!isUuid(id)) return null
  const { rows } = await pool.query<CommissionDetail>(
    `select c.id, c.creator_id, c.title, c.description, c.category, c.price, c.turnaround_days,
            c.max_slots, c.status, c.sample_urls, c.sample_urls[1] as cover_url,
            active_request_count(c.id) as active_count,
            (select min(r.due_at) from requests r
              where r.commission_id = c.id and r.status in ('accepted', 'delivered')) as next_free_at,
            p.nickname as creator_nickname, p.bio as creator_bio
       from commissions c join profiles p on p.id = c.creator_id
      where c.id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export async function createCommission(input: {
  creatorId: string
  title: string
  description: string
  category: string
  price: number
  turnaroundDays: number
  maxSlots: number
  sampleUrls: string[]
}) {
  const { rows } = await pool.query<{ id: string }>(
    `insert into commissions (creator_id, title, description, category, price, turnaround_days, max_slots, sample_urls)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [input.creatorId, input.title, input.description, input.category, input.price,
     input.turnaroundDays, input.maxSlots, input.sampleUrls],
  )
  return rows[0].id
}

/** 열고 닫기. 본인 것만 바뀌도록 creator_id 를 조건에 넣는다. 바뀐 줄이 없으면 false. */
export async function setCommissionStatus(id: string, creatorId: string, status: 'open' | 'closed') {
  const { rowCount } = await pool.query(
    `update commissions set status = $3 where id = $1 and creator_id = $2`, [id, creatorId, status],
  )
  return (rowCount ?? 0) > 0
}

export type Outcome = { outcome: 'accepted' | 'rejected'; reject_reason: string | null; request_id?: string }

async function callFn(fn: string, args: unknown[]): Promise<Outcome> {
  const placeholders = args.map((_, i) => `$${i + 1}`).join(', ')
  const { rows } = await pool.query<{ r: Outcome }>(`select ${fn}(${placeholders}) as r`, args)
  return rows[0].r
}

// 의뢰 상태를 바꾸는 여섯 함수. 전부 DB 함수 호출이고 거부 사유를 결과로 돌려준다.
export const submitRequest = (commissionId: string, clientId: string, brief: string, referenceUrl: string | null) =>
  callFn('submit_request', [commissionId, clientId, brief, referenceUrl])
export const acceptRequest = (requestId: string, creatorId: string, finalPrice: number) =>
  callFn('accept_request', [requestId, creatorId, finalPrice])
export const declineRequest = (requestId: string, creatorId: string, reason: string) =>
  callFn('decline_request', [requestId, creatorId, reason])
export const cancelRequest = (requestId: string, clientId: string) =>
  callFn('cancel_request', [requestId, clientId])
export const deliverRequest = (requestId: string, creatorId: string, url: string | null, note: string | null) =>
  callFn('deliver_request', [requestId, creatorId, url, note])
export const completeRequest = (requestId: string, clientId: string) =>
  callFn('complete_request', [requestId, clientId])

export type RequestRow = {
  id: string
  commission_id: string
  commission_title: string
  creator_id: string
  creator_nickname: string
  client_id: string
  client_nickname: string
  brief: string
  reference_url: string | null
  status: string
  quoted_price: number
  final_price: number | null
  decline_reason: string | null
  accepted_at: Date | null
  due_at: Date | null
  delivered_at: Date | null
  delivery_url: string | null
  delivery_note: string | null
  completed_at: Date | null
  created_at: Date
  /** 수락 화면이 마감일과 자리를 실제 값으로 보여 주려고 커미션 쪽 숫자를 함께 읽는다 (UI/UX 1회차 발견 1). */
  turnaround_days: number
  max_slots: number
  active_count: number
  /** 지금 수락하면 박힐 마감일. 화면이 시계를 직접 읽지 않도록 DB 가 계산한다. */
  due_at_if_now: Date
}

const REQUEST_SELECT = `
  select r.id, r.commission_id, c.title as commission_title, c.creator_id,
         creator.nickname as creator_nickname, r.client_id, client.nickname as client_nickname,
         r.brief, r.reference_url, r.status, r.quoted_price, r.final_price, r.decline_reason,
         r.accepted_at, r.due_at, r.delivered_at, r.delivery_url, r.delivery_note, r.completed_at,
         r.created_at,
         c.turnaround_days, c.max_slots, active_request_count(c.id) as active_count,
         now() + make_interval(days => c.turnaround_days) as due_at_if_now
    from requests r
    join commissions c on c.id = r.commission_id
    join profiles creator on creator.id = c.creator_id
    join profiles client on client.id = r.client_id`

export async function getRequest(id: string): Promise<RequestRow | null> {
  if (!isUuid(id)) return null
  const { rows } = await pool.query<RequestRow>(`${REQUEST_SELECT} where r.id = $1`, [id])
  return rows[0] ?? null
}

/** 내가 넣은 의뢰. 최신순. */
export async function listMyRequests(clientId: string): Promise<RequestRow[]> {
  const { rows } = await pool.query<RequestRow>(
    `${REQUEST_SELECT} where r.client_id = $1 order by r.created_at desc`, [clientId],
  )
  return rows
}

/** 내 커미션으로 들어온 의뢰. 대기 중이 먼저, 그다음 진행 중, 끝난 것은 뒤로. */
export async function listIncomingRequests(creatorId: string): Promise<RequestRow[]> {
  const { rows } = await pool.query<RequestRow>(
    `${REQUEST_SELECT} where c.creator_id = $1
      order by case r.status when 'requested' then 0 when 'accepted' then 1 when 'delivered' then 2 else 3 end,
               r.created_at desc`,
    [creatorId],
  )
  return rows
}

export async function listMyCommissions(creatorId: string): Promise<CommissionCard[]> {
  const { rows } = await pool.query<CommissionCard>(`
    select c.id, c.title, c.category, c.price, c.turnaround_days, c.max_slots, c.status,
           active_request_count(c.id) as active_count, c.sample_urls[1] as cover_url,
           p.nickname as creator_nickname
      from commissions c join profiles p on p.id = c.creator_id
     where c.creator_id = $1
     order by c.created_at desc`, [creatorId])
  return rows
}

/** 로그인 대신 쓰는 사용자 목록. 카카오 로그인이 붙으면 사라진다. */
export async function listDemoUsers() {
  const { rows } = await pool.query<{ id: string; nickname: string }>(
    `select id, nickname from profiles order by created_at, nickname`,
  )
  return rows
}

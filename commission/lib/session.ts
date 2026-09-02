import { cookies } from 'next/headers'
import { pool } from './db'

/**
 * 지금 누구로 보고 있는가.
 *
 * 카카오 로그인이 아직 없어서 쿠키에 사용자 id 를 담아 흉내낸다.
 * 로그인이 붙으면 이 함수 안만 Supabase 세션 조회로 바꾸면 되고, 화면들은 그대로 둔다.
 */
export async function getCurrentUserId() {
  const jar = await cookies()
  return jar.get('demo_user')?.value ?? null
}

export type CurrentUser = {
  id: string
  nickname: string
  bio: string | null
  /** 텀블벅 펀딩 이력. 지금은 시연용 더미다 — 본 서비스와 연결되어 있지 않다. */
  backer_count: number
  satisfaction: number | null
  satisfaction_count: number
  follower_count: number
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const id = await getCurrentUserId()
  if (!id) return null
  const { rows } = await pool.query<CurrentUser>(
    `select id, nickname, bio, backer_count, satisfaction::float8 as satisfaction,
            satisfaction_count, follower_count
       from profiles where id = $1`,
    [id],
  )
  return rows[0] ?? null
}

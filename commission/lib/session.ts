import { cookies } from 'next/headers'
import { pool } from './db'

/**
 * 시연용 로그인이 켜져 있나.
 *
 * 지금 로그인은 `demo_user` 쿠키 하나가 전부다. 전환기가 폼에서 받은 id 를 검증 없이 쿠키에 넣고,
 * 이 파일이 그 쿠키를 그대로 믿는다. **공개 주소에 이대로 올라가면 누구나 쿠키만 바꿔서 남이 된다** —
 * 남의 의뢰 내용(취향과 연락 수단)을 읽고, 대신 수락하고, 대신 물릴 수 있다.
 *
 * 그래서 **배포에서는 기본이 꺼짐**이다. 켜려면 `DEMO_LOGIN=on` 으로 분명히 켜야 하고,
 * 켤 때는 주소 자체를 비공개로 막아야 한다 (`DEPLOY.md`).
 * 로컬 개발에서는 켜져 있다 — 안 그러면 아무 화면도 못 본다.
 *
 * 카카오 로그인이 붙으면 이 문과 전환기가 통째로 사라진다.
 */
export function demoLoginEnabled(env: Record<string, string | undefined> = process.env) {
  if (env.DEMO_LOGIN === 'on') return true
  if (env.DEMO_LOGIN === 'off') return false
  return env.NODE_ENV !== 'production'
}

/**
 * 지금 누구로 보고 있는가.
 *
 * 카카오 로그인이 아직 없어서 쿠키에 사용자 id 를 담아 흉내낸다.
 * 로그인이 붙으면 이 함수 안만 Supabase 세션 조회로 바꾸면 되고, 화면들은 그대로 둔다.
 *
 * 시연용 로그인이 꺼져 있으면 **쿠키가 남아 있어도 아무도 아니다.** 끄는 것이 곧 잠그는 것이어야 한다 —
 * 전환기만 숨기고 쿠키를 계속 믿으면, 이미 쿠키를 가진 사람은 그대로 통과한다.
 */
export async function getCurrentUserId() {
  if (!demoLoginEnabled()) return null
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

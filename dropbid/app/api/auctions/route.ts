import { NextResponse } from 'next/server'
import { listLiveAuctions, listLastDropResults } from '@/lib/db'

/**
 * 이번 회차 목록.
 *
 * 네이티브 앱이 쓰는 길이다. 앱이 Supabase 에 직접 붙지 않고 여기를 거치는 이유 —
 * 1. 목록에 판매자 이름이 필요한데 `profiles` 는 로그인한 사람만 볼 수 있다 (RLS)
 * 2. 쓰기(입찰·등록·검수)는 어차피 서버를 거쳐야 한다. `place_bid` 는 anon 에게서
 *    실행 권한이 회수돼 있다 (`lock_write_paths` 마이그레이션)
 * 데이터 길을 둘로 나누면 규칙도 두 벌이 된다. 하나로 둔다.
 *
 * 읽기 전용이라 로그인 없이 연다. 여기서 나가는 값은 이미 화면에 뜨는 것들뿐이다.
 */
export const dynamic = 'force-dynamic'

/**
 * 읽기 전용 공개 목록이라 어디서든 읽게 연다.
 * 네이티브 앱에는 CORS 가 필요 없지만, 브라우저로 확인할 때 필요하다.
 * 여기서 나가는 값은 이미 웹 화면에 그대로 뜨는 것들뿐이다.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}


export async function GET() {
  const [auctions, past] = await Promise.all([listLiveAuctions(), listLastDropResults()])
  return NextResponse.json(
    { serverNow: new Date().toISOString(), auctions, past },
    { headers: CORS },
  )
}

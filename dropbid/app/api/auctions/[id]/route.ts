import { NextResponse } from 'next/server'
import { getAuction } from '@/lib/db'

/** 상품 상세. 없는 id 와 uuid 가 아닌 값은 getAuction 이 함께 걸러 준다. */
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


export async function GET(_req: Request, ctx: RouteContext<'/api/auctions/[id]'>) {
  const { id } = await ctx.params
  const auction = await getAuction(id)
  if (!auction) {
    return NextResponse.json({ error: '찾을 수 없는 경매입니다.' }, { status: 404, headers: CORS })
  }
  return NextResponse.json({ serverNow: new Date().toISOString(), auction }, { headers: CORS })
}

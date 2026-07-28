/**
 * 개인정보 파기 — handoff 6장. 쿼리 하나가 전부다.
 *
 * 멱등하다. 여러 번 돌아도 결과가 같아서 실행 이력 테이블도 락도 두지 않는다.
 * `guest_email IS NOT NULL` 이 이미 비운 행을 걸러내므로 `purged_at` 컬럼도 없다.
 */
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { db } from "@/lib/supabase";

const RETENTION_MONTHS = 3;

export async function GET(request: NextRequest) {
  // Vercel Cron 이 이 헤더를 붙인다. 없으면 누구나 부를 수 있는 공개 경로가 된다.
  if (request.headers.get("authorization") !== `Bearer ${env("CRON_SECRET")}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);

  const { data, error } = await db()
    .from("booking")
    .update({
      guest_name: null,
      guest_company: null,
      guest_email: null,
      guest_phone: null,
      memo: null,
    })
    .lt("start_at", cutoff.toISOString())
    .not("guest_email", "is", null)
    .select("seq");

  if (error) throw new Error(`파기 실패: ${error.message}`);

  // page_id·start_at 은 남는다. 지운 건 게스트 5개 컬럼뿐이다.
  return NextResponse.json({ purged: data?.length ?? 0 });
}

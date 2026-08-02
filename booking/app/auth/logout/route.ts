import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/supabase";

/** 로그아웃. 연동은 그대로 둔다 — 캘린더를 끊는 건 API 8 이다. */
export async function POST(request: NextRequest) {
  await (await auth()).auth.signOut();
  return NextResponse.redirect(new URL("/admin", request.nextUrl.origin), { status: 303 });
}

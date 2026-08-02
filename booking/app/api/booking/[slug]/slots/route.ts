/** 슬롯 목록 — handoff API 10. 인증 없음. */
import { NextResponse, type NextRequest } from "next/server";

import { pageBySlug, slotsFor } from "@/lib/bookings";
import { kstEpoch, WINDOW_DAYS } from "@/lib/slots";

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest, ctx: RouteContext<"/api/booking/[slug]/slots">) {
  const { slug } = await ctx.params;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  if (!from || !to || !YMD.test(from) || !YMD.test(to)) {
    return NextResponse.json({ error: "from·to 는 YYYY-MM-DD 다" }, { status: 400 });
  }

  // 범위는 여기서 본다. slotsFor 가 던지는 걸 받아 400 으로 바꾸면 구글이나 DB
  // 장애까지 "부르는 쪽 잘못" 으로 뭉뚱그리게 된다.
  const span = (kstEpoch(to) - kstEpoch(from)) / DAY_MS;
  if (span < 0 || span > WINDOW_DAYS) {
    return NextResponse.json({ error: `범위는 0~${WINDOW_DAYS}일이다` }, { status: 400 });
  }

  const page = await pageBySlug(slug);
  if (!page) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const slots = await slotsFor(page, from, to, Date.now());

  // 미연동·비활성이면 9번이 이미 bookable: false 를 내렸다. 여기까지 왔다면
  // 프런트가 그걸 무시한 것이라 빈 목록으로 답한다.
  return NextResponse.json({ slots: slots ?? [] });
}

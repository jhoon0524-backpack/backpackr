/** 담당자 취소 — handoff API 5. 시간 제한이 없다. */
import { NextResponse, type NextRequest } from "next/server";

import { bookingByPublicId, cancel, type PageWithOwner } from "@/lib/bookings";
import { db, host } from "@/lib/supabase";

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/admin/api/bookings/[uuid]">,
) {
  const user = await host();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { uuid } = await ctx.params;
  const booking = await bookingByPublicId(uuid);
  if (!booking) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (booking.canceled_ref !== 0) return new NextResponse(null, { status: 204 });

  // 남의 예약은 못 지운다. 유형 조회에 member_id 를 함께 걸어 0건이면 404 다.
  const { data } = await db()
    .from("booking_page")
    .select("*")
    .eq("id", booking.page_id)
    .eq("member_id", user.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await cancel(booking, data as PageWithOwner, Date.now(), false);
  return new NextResponse(null, { status: 204 });
}

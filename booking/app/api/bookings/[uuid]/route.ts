/**
 * 취소 화면 조회 · 예약자 취소 — handoff API 12·13. 인증 없음.
 *
 * UUID 를 아는 사람이 예약자라고 본다. 취소 링크가 확정 메일로만 나가므로
 * 링크를 가진 사람과 예약자가 같다.
 */
import { NextResponse, type NextRequest } from "next/server";

import { bookingByPublicId, cancel, hostProfile } from "@/lib/bookings";
import { db } from "@/lib/supabase";
import { guestCancelable } from "@/lib/slots";

import type { PageWithOwner } from "@/lib/bookings";

async function pageOf(pageId: number): Promise<PageWithOwner> {
  const { data } = await db().from("booking_page").select("*").eq("id", pageId).single();
  return data as PageWithOwner;
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/bookings/[uuid]">) {
  const { uuid } = await ctx.params;
  const booking = await bookingByPublicId(uuid);
  if (!booking) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const page = await pageOf(booking.page_id);
  const host = await hostProfile(page.member_id);
  const startAt = Date.parse(booking.start_at);

  return NextResponse.json({
    startAt,
    durationMin: page.duration_min,
    title: page.title,
    hostName: host.name,
    hostEmail: host.email,
    guestName: booking.guest_name,
    canceled: booking.canceled_ref !== 0,
    cancelable: booking.canceled_ref === 0 && guestCancelable(startAt, Date.now()),
  });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/bookings/[uuid]">) {
  const { uuid } = await ctx.params;
  const booking = await bookingByPublicId(uuid);
  if (!booking) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (booking.canceled_ref !== 0) return new NextResponse(null, { status: 204 });

  const result = await cancel(booking, await pageOf(booking.page_id), Date.now(), true);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
  return new NextResponse(null, { status: 204 });
}

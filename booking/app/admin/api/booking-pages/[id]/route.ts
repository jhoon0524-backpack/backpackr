/**
 * 예약 유형 수정·삭제 — handoff API 3·4.
 *
 * 두 라우트 모두 `member_id` 를 조건에 함께 건다. 남의 유형 ID 를 넣어도
 * 0건이 걸려 404 가 된다 — 소유 확인을 위한 조회를 따로 하지 않는다.
 */
import { NextResponse, type NextRequest } from "next/server";

import { fromRow, parsePageInput, toRow, type PageRow } from "@/lib/bookingPage";
import { db, host } from "@/lib/supabase";

export async function PUT(request: NextRequest, ctx: RouteContext<"/admin/api/booking-pages/[id]">) {
  const user = await host();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const parsed = parsePageInput(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { id } = await ctx.params;
  const { data, error } = await db()
    .from("booking_page")
    .update({ ...toRow(parsed.value), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("member_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`예약 유형 수정 실패: ${error.message}`);
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(fromRow(data as PageRow));
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/admin/api/booking-pages/[id]">,
) {
  const user = await host();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await ctx.params;
  const client = db();

  // 미래 활성 예약이 있으면 막는다. 예약자에게 이미 나간 약속이라
  // 유형만 지우면 예약은 남고 페이지만 사라지는 상태가 된다.
  const { count } = await client
    .from("booking")
    .select("seq", { count: "exact", head: true })
    .eq("page_id", id)
    .eq("canceled_ref", 0)
    .gte("start_at", new Date().toISOString());

  if (count) return NextResponse.json({ error: "HAS_FUTURE_BOOKINGS" }, { status: 409 });

  const { data, error } = await client
    .from("booking_page")
    .delete()
    .eq("id", id)
    .eq("member_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`예약 유형 삭제 실패: ${error.message}`);
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

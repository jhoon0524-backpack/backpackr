/**
 * 예약 유형 목록·생성 — handoff API 1·2.
 *
 * 1번이 화면 ① 에 필요한 것을 한 번에 준다. 예약 목록을 따로 떼면 소비자가
 * 하나뿐인데 호출만 두 번이 된다.
 */
import { NextResponse, type NextRequest } from "next/server";

import { fromRow, newSlug, parsePageInput, toRow, type PageRow } from "@/lib/bookingPage";
import { connection } from "@/lib/calendar";
import { env } from "@/lib/env";
import { db, host } from "@/lib/supabase";

const SLUG_RETRIES = 3;

export async function GET() {
  const user = await host();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const client = db();
  const { data: rows, error } = await client
    .from("booking_page")
    .select("*")
    .eq("member_id", user.id)
    .order("created_at");
  if (error) throw new Error(`예약 유형 조회 실패: ${error.message}`);

  const pages = (rows ?? []) as PageRow[];
  const titles = new Map(pages.map((p) => [p.id, p.title]));

  // 다가오는 활성 예약. 담당자가 가진 유형이 없으면 물어볼 것도 없다.
  const { data: bookings } = pages.length
    ? await client
        .from("booking")
        .select("id, page_id, start_at, guest_name, guest_company, guest_email, guest_phone, memo, sync_error")
        .in("page_id", [...titles.keys()])
        .eq("canceled_ref", 0)
        .gte("start_at", new Date().toISOString())
        .order("start_at")
    : { data: [] };

  return NextResponse.json({
    calendarConnected: (await connection(user.id)) !== null,
    pages: pages.map((row) => ({
      ...fromRow(row),
      url: `${env("BOOKING_BASE_URL")}/b/${row.slug}`,
    })),
    upcoming: (bookings ?? []).map((b) => ({
      id: b.id,
      pageId: b.page_id,
      pageTitle: titles.get(b.page_id),
      startAt: Date.parse(b.start_at),
      guestName: b.guest_name,
      guestCompany: b.guest_company,
      guestEmail: b.guest_email,
      guestPhone: b.guest_phone,
      memo: b.memo,
      syncError: b.sync_error,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await host();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const parsed = parsePageInput(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const row = { ...toRow(parsed.value), member_id: user.id };

  // slug 충돌은 8자 UUID 앞부분이라 사실상 안 나지만, 났을 때 500 을 내는 대신
  // 한 번 더 뽑는다. uk_slug 가 판정하므로 사전 조회가 필요 없다.
  for (let attempt = 0; attempt < SLUG_RETRIES; attempt++) {
    const { data, error } = await db()
      .from("booking_page")
      .insert({ ...row, slug: newSlug() })
      .select("*")
      .single();

    if (!error) return NextResponse.json(fromRow(data as PageRow), { status: 201 });
    if (error.code !== "23505") throw new Error(`예약 유형 생성 실패: ${error.message}`);
  }

  throw new Error(`slug 를 ${SLUG_RETRIES}번 뽑았는데 전부 충돌했다`);
}

/** 연동 해제 — handoff API 8. row DELETE 가 전부다. */
import { NextResponse } from "next/server";

import { disconnect } from "@/lib/calendar";
import { host } from "@/lib/supabase";

export async function DELETE() {
  const user = await host();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  await disconnect(user.id);
  return new NextResponse(null, { status: 204 });
}

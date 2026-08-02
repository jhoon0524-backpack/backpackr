/**
 * 페이지 메타 · 예약 확정 — handoff API 9·11. 인증 없음, 외부 리드가 부른다.
 */
import { NextResponse, type NextRequest } from "next/server";

import { confirm, hostProfile, pageBySlug } from "@/lib/bookings";
import { connection } from "@/lib/calendar";

const STATUS: Record<string, number> = {
  SLOT_TAKEN: 409,
  NOT_BOOKABLE: 409,
  CALENDAR_FAILED: 503,
};

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/booking/[slug]">) {
  const { slug } = await ctx.params;
  const page = await pageBySlug(slug);
  if (!page) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const host = await hostProfile(page.member_id);

  // 미연동·토큰 철회는 에러가 아니라 상태다. 여기서 bookable: false 를 내리면
  // 프런트가 슬롯 조회를 건너뛰고 안내 문구를 렌더한다. 에러로 만들면 본문을 못 싣는다.
  return NextResponse.json({
    title: page.title,
    description: page.description,
    durationMin: page.duration_min,
    hostName: host.name,
    hostEmail: host.email,
    // 링크 자체는 확정 전에 내리지 않는다. 예약도 안 한 사람이 미팅방에 들어갈 수 있다.
    online: page.meeting_url !== null,
    bookable: page.active && (await connection(page.member_id)) !== null,
  });
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/booking/[slug]">) {
  const { slug } = await ctx.params;
  const page = await pageBySlug(slug);
  if (!page) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "본문이 객체가 아니다" }, { status: 400 });
  }

  const { startAt, name, email, company, phone, memo, consent } = body as Record<string, unknown>;

  // 동의 없이 개인정보를 받지 않는다.
  if (consent !== true) return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 });
  if (typeof startAt !== "number") {
    return NextResponse.json({ error: "시작 시각이 없다" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "이름이 없다" }, { status: 400 });
  }
  // 캘린더 초대를 보내야 하므로 메일 주소는 선택이 아니다.
  if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "메일 주소 형식이 아니다" }, { status: 400 });
  }

  const result = await confirm(
    page,
    startAt,
    {
      name: name.trim(),
      email: email.trim(),
      company: text(company),
      phone: text(phone),
      memo: text(memo),
    },
    Date.now(),
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: STATUS[result.error] ?? 409 });
  }

  const host = await hostProfile(page.member_id);
  // 확정 화면이 .ics 를 프런트에서 만든다. 서버를 한 번 더 부를 이유가 없도록
  // 시각·제목·링크·담당자를 여기서 함께 내린다.
  return NextResponse.json(
    {
      id: result.id,
      startAt,
      durationMin: page.duration_min,
      title: page.title,
      meetingUrl: page.meeting_url,
      hostName: host.name,
    },
    { status: 201 },
  );
}

function text(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

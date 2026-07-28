/**
 * 공개 예약 — handoff 4·5장. 슬롯 조회, 확정, 취소.
 *
 * **핸드오프의 트랜잭션을 그대로 옮기지 못한 곳이 하나 있다.** 원래는 캘린더
 * 이벤트 생성이 DB 트랜잭션 안에 있어서 실패하면 롤백됐다. Supabase 는 REST 라
 * HTTP 호출을 트랜잭션으로 감쌀 수 없어서, 넣고 → 부르고 → 실패하면 지우는
 * 보상 삭제로 바꿨다. 실패 정책("캘린더에 없는 예약을 만들지 않는다")은 같지만,
 * 보상 삭제 직전에 프로세스가 죽으면 `gcal_event_id IS NULL` 인 활성 예약이
 * 남는다. 슬롯은 막혔는데 담당자 캘린더에는 없는 상태다 — 그 조건으로 찾아낼
 * 수 있으니 필요해지면 청소 작업을 붙인다.
 */
import type { PageRow } from "./bookingPage";
import { connection } from "./calendar";
import { createEvent, deleteEvent, freeBusy } from "./google";
import {
  availableSlots,
  guestCancelable,
  kstEpoch,
  kstFields,
  type BookingPage,
  type Dow,
  type Hours,
} from "./slots";
import { db } from "./supabase";

const DAY_MS = 24 * 60 * 60 * 1000;

export type PageWithOwner = PageRow & { member_id: string };

export type Failure = "SLOT_TAKEN" | "CALENDAR_FAILED" | "NOT_BOOKABLE" | "CANCEL_WINDOW_CLOSED";

export type Guest = {
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  memo: string | null;
};

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function toBookingPage(page: PageWithOwner): BookingPage {
  return {
    durationMin: page.duration_min,
    weeklyHours: page.weekly_hours as Partial<Record<Dow, Hours[]>>,
    blockedDates: page.blocked_dates as string[],
  };
}

export async function pageBySlug(slug: string): Promise<PageWithOwner | null> {
  const { data } = await db().from("booking_page").select("*").eq("slug", slug).maybeSingle();
  return (data as PageWithOwner) ?? null;
}

/** 담당자 표시 이름과 회신 주소. member 테이블 대신 로그인 계정에서 읽는다. */
export async function hostProfile(memberId: string): Promise<{ name: string; email: string }> {
  const { data } = await db().auth.admin.getUserById(memberId);
  const email = data.user?.email ?? "";
  return { name: (data.user?.user_metadata?.full_name as string) || email || "담당자", email };
}

/**
 * 예약 가능한 슬롯. **null 은 예약을 받을 수 없는 상태다** — 비활성이거나
 * 캘린더가 연동되지 않았다. 에러가 아니라 상태라 호출자가 안내 문구를 렌더한다.
 */
export async function slotsFor(
  page: PageWithOwner,
  from: string,
  to: string,
  now: number,
): Promise<number[] | null> {
  if (!page.active) return null;
  const calendar = await connection(page.member_id);
  if (!calendar) return null;

  const fromMs = kstEpoch(from);
  const toMs = kstEpoch(to) + DAY_MS;

  const { data } = await db()
    .from("booking")
    .select("start_at")
    .eq("page_id", page.id)
    .eq("canceled_ref", 0)
    .gte("start_at", iso(fromMs))
    .lt("start_at", iso(toMs));

  const busy = await freeBusy(calendar.token, calendar.calendarId, fromMs, toMs);

  return availableSlots(
    toBookingPage(page),
    from,
    to,
    now,
    (data ?? []).map((b) => Date.parse(b.start_at)),
    busy,
  );
}

/** 확정. 순서가 중요하다 — handoff 5장 */
export async function confirm(
  page: PageWithOwner,
  startAt: number,
  guest: Guest,
  now: number,
): Promise<{ id: string } | { error: Failure }> {
  const calendar = await connection(page.member_id);
  if (!page.active || !calendar) return { error: "NOT_BOOKABLE" };

  // 1. 슬롯 유효성 재검증. 폼을 채우는 사이에 남이 가져갔을 수 있다.
  const day = kstFields(startAt).ymd;
  const open = await slotsFor(page, day, day, now);
  if (!open?.includes(startAt)) return { error: "SLOT_TAKEN" };

  // 2. INSERT. 동시 요청은 uk_slot 이 막는다 — 애플리케이션 락을 두지 않는다.
  const { data, error } = await db()
    .from("booking")
    .insert({
      page_id: page.id,
      start_at: iso(startAt),
      guest_name: guest.name,
      guest_company: guest.company,
      guest_email: guest.email,
      guest_phone: guest.phone,
      memo: guest.memo,
    })
    .select("seq, id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "SLOT_TAKEN" };
    throw new Error(`예약 저장 실패: ${error.message}`);
  }

  // 3. 캘린더 이벤트. 실패하면 예약을 남기지 않는다.
  try {
    const eventId = await createEvent(calendar.token, calendar.calendarId, {
      summary: `${page.title} — ${guest.name}`,
      description: [guest.company, guest.memo].filter(Boolean).join("\n\n") || undefined,
      start: startAt,
      end: startAt + page.duration_min * 60_000,
      guestEmail: guest.email,
      meetingUrl: page.meeting_url ?? undefined,
    });
    await db().from("booking").update({ gcal_event_id: eventId }).eq("seq", data.seq);
  } catch {
    await db().from("booking").delete().eq("seq", data.seq);
    return { error: "CALENDAR_FAILED" };
  }

  return { id: data.id };
}

export type BookingRow = {
  seq: number;
  id: string;
  page_id: number;
  start_at: string;
  gcal_event_id: string | null;
  canceled_ref: number;
  guest_name: string | null;
};

export async function bookingByPublicId(uuid: string): Promise<BookingRow | null> {
  const { data } = await db()
    .from("booking")
    .select("seq, id, page_id, start_at, gcal_event_id, canceled_ref, guest_name")
    .eq("id", uuid)
    .maybeSingle();
  return (data as BookingRow) ?? null;
}

/**
 * 취소. 예약자는 미팅 2시간 전까지, 담당자는 제한 없다.
 *
 * 캘린더 삭제가 실패해도 취소는 유효하다 — `sync_error='CAL_DELETE'` 를 찍고
 * 어드민 목록의 뱃지로 넘긴다.
 */
export async function cancel(
  booking: BookingRow,
  page: PageWithOwner,
  now: number,
  byGuest: boolean,
): Promise<{ ok: true } | { error: Failure }> {
  if (byGuest && !guestCancelable(Date.parse(booking.start_at), now)) {
    return { error: "CANCEL_WINDOW_CLOSED" };
  }

  const { error } = await db()
    .from("booking")
    .update({ canceled_at: iso(now), canceled_ref: booking.seq })
    .eq("seq", booking.seq)
    .eq("canceled_ref", 0);
  if (error) throw new Error(`취소 저장 실패: ${error.message}`);

  if (booking.gcal_event_id) {
    const calendar = await connection(page.member_id);
    try {
      if (!calendar) throw new Error("연동이 끊겨 이벤트를 지울 수 없다");
      await deleteEvent(calendar.token, calendar.calendarId, booking.gcal_event_id);
    } catch {
      await db().from("booking").update({ sync_error: "CAL_DELETE" }).eq("seq", booking.seq);
    }
  }

  return { ok: true };
}

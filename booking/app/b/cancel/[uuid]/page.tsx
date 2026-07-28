/**
 * 취소 화면 ⑤ — 확정 메일의 취소 링크가 여기로 온다.
 *
 * UUID 를 아는 사람이 예약자라고 본다. 링크가 확정 메일로만 나가므로
 * 링크를 가진 사람과 예약자가 같다.
 */
import { notFound } from "next/navigation";

import { bookingByPublicId, hostProfile } from "@/lib/bookings";
import { guestCancelable } from "@/lib/slots";
import { db } from "@/lib/supabase";

import { Cancel } from "./Cancel";
import "../../booking.css";

export default async function CancelPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  const booking = await bookingByPublicId(uuid);
  if (!booking) notFound();

  const { data: page } = await db()
    .from("booking_page")
    .select("title, duration_min, member_id")
    .eq("id", booking.page_id)
    .single();

  // FK + cascade 라 예약이 있으면 유형도 있다. 타입을 좁히려고 두는 줄이다.
  if (!page) notFound();

  const host = await hostProfile(page.member_id);
  const startAt = Date.parse(booking.start_at);

  return (
    <Cancel
      id={booking.id}
      startAt={startAt}
      durationMin={page.duration_min}
      title={page.title}
      hostName={host.name}
      hostEmail={host.email}
      canceled={booking.canceled_ref !== 0}
      // 서버 컴포넌트는 요청당 한 번 렌더된다. react-hooks/purity 는 클라이언트
      // 재렌더를 전제로 Date.now 를 막는데, 요청 시각은 그 전제에 해당하지 않는다.
      // eslint-disable-next-line react-hooks/purity
      cancelable={guestCancelable(startAt, Date.now())}
    />
  );
}

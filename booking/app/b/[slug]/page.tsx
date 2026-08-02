/**
 * 공개 예약 페이지 — 화면 ③. SSR 로 페이지 메타를 실어 보낸다.
 *
 * 메타를 클라이언트에서 다시 부르지 않는다. 링크를 연 사람에게 제목과 담당자가
 * 곧바로 보여야 하고, 검색 로봇이 읽을 것도 이 본문이다.
 */
import { notFound } from "next/navigation";

import { hostProfile, pageBySlug } from "@/lib/bookings";
import { connection } from "@/lib/calendar";

import { Booking } from "./Booking";
import "../booking.css";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const page = await pageBySlug(slug);
  if (!page) notFound();

  // 서버 컴포넌트는 요청당 한 번 렌더된다. react-hooks/purity 는 클라이언트
  // 재렌더를 전제로 Date.now 를 막는데, 요청 시각은 그 전제에 해당하지 않는다.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const [host, calendar, prefill] = await Promise.all([
    hostProfile(page.member_id),
    connection(page.member_id),
    searchParams,
  ]);

  return (
    <Booking
      slug={slug}
      title={page.title}
      description={page.description}
      durationMin={page.duration_min}
      hostName={host.name}
      hostEmail={host.email}
      online={page.meeting_url !== null}
      bookable={page.active && calendar !== null}
      now={now}
      prefill={{
        name: one(prefill.name),
        company: one(prefill.company),
        email: one(prefill.email),
        phone: one(prefill.phone),
      }}
    />
  );
}

/** 맞춤 예약 링크의 프리필. 엔드포인트 없이 쿼리 파라미터로만 오간다 */
function one(raw: string | string[] | undefined): string {
  return typeof raw === "string" ? raw : "";
}

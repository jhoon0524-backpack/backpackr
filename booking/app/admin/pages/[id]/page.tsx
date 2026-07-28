import { notFound, redirect } from "next/navigation";

import type { Dow, Hours } from "@/lib/slots";
import { db, host } from "@/lib/supabase";

import { PageForm } from "../PageForm";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await host();
  if (!user) redirect("/admin");

  const { id } = await params;
  // member_id 를 함께 걸어 남의 유형은 애초에 안 걸린다.
  const { data } = await db()
    .from("booking_page")
    .select("*")
    .eq("id", id)
    .eq("member_id", user.id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <PageForm
      id={data.id}
      initial={{
        title: data.title,
        description: data.description ?? "",
        durationMin: data.duration_min,
        weeklyHours: data.weekly_hours as Partial<Record<Dow, Hours[]>>,
        blockedDates: data.blocked_dates as string[],
        meetingUrl: data.meeting_url ?? "",
        active: data.active,
      }}
    />
  );
}

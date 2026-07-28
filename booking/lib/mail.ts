/**
 * 확정·취소 메일 — handoff 5장 "메일 헤더 규약".
 *
 * **발신 주소는 담당자별로 바꾸지 않는다.** 담당자 명의로 보이게 하는 목적은
 * 표시 이름만으로 달성된다. From 을 실제 담당자 주소로 바꾸면 두 가지를 잃는다 —
 * 신청자 주소 오타로 인한 반송 메일이 담당자 개인 받은편지함으로 흩어져 시스템이
 * 실패를 관측하지 못하고(SMTP 단계는 성공이라 sync_error 도 안 찍힌다), 담당자가
 * 퇴사하거나 주소를 바꾸면 과거 예약자의 회신 경로가 끊긴다.
 *
 * 캘린더 초대는 이 규약과 무관하다. 구글이 담당자 계정에서 직접 보내므로
 * 이미 개인 명의다.
 */
import nodemailer from "nodemailer";

import { env } from "./env";
import { range } from "./format";

export type Host = { name: string; email: string };

export type MailBooking = {
  id: string;
  startAt: number;
  durationMin: number;
  title: string;
  meetingUrl: string | null;
  guestName: string;
  guestEmail: string;
};

function transport() {
  const port = Number(env("SMTP_PORT"));
  return nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port,
    secure: port === 465,
    auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
  });
}

function cancelUrl(id: string): string {
  return `${env("BOOKING_BASE_URL")}/b/cancel/${id}`;
}

async function send(to: string, subject: string, text: string, host: Host): Promise<void> {
  await transport().sendMail({
    from: `"${host.name} (백패커)" <${env("MAIL_FROM")}>`,
    replyTo: host.email,
    to,
    subject,
    text,
  });
}

/** 확정 메일 양측. 한쪽이라도 실패하면 던진다 — 호출자가 sync_error 를 찍는다. */
export async function sendConfirmed(booking: MailBooking, host: Host): Promise<void> {
  const when = range(booking.startAt, booking.durationMin);
  const where = booking.meetingUrl ? `\n미팅 링크: ${booking.meetingUrl}` : "";

  await send(
    booking.guestEmail,
    `[예약 확정] ${when} · ${booking.title}`,
    `${booking.guestName}님, 미팅이 확정되었습니다.\n\n` +
      `일시: ${when} (KST)\n담당: ${host.name}\n내용: ${booking.title}${where}\n\n` +
      `캘린더 초대를 함께 보냈습니다.\n` +
      `일정을 취소해야 하면 아래 링크를 이용해 주세요. 미팅 시작 2시간 전까지 가능합니다.\n` +
      `${cancelUrl(booking.id)}\n`,
    host,
  );

  await send(
    host.email,
    `[새 예약] ${when} · ${booking.guestName}`,
    `새 예약이 들어왔습니다.\n\n` +
      `일시: ${when} (KST)\n신청자: ${booking.guestName} (${booking.guestEmail})\n` +
      `내용: ${booking.title}${where}\n`,
    host,
  );
}

export async function sendCanceled(booking: MailBooking, host: Host): Promise<void> {
  const when = range(booking.startAt, booking.durationMin);

  await send(
    booking.guestEmail,
    `[예약 취소] ${when} · ${booking.title}`,
    `${booking.guestName}님, 아래 미팅이 취소되었습니다.\n\n` +
      `일시: ${when} (KST)\n담당: ${host.name}\n내용: ${booking.title}\n\n` +
      `다시 잡으시려면 예약 페이지에서 새로 신청해 주세요.\n`,
    host,
  );

  await send(
    host.email,
    `[예약 취소] ${when} · ${booking.guestName}`,
    `예약이 취소되었습니다.\n\n` +
      `일시: ${when} (KST)\n신청자: ${booking.guestName} (${booking.guestEmail})\n` +
      `내용: ${booking.title}\n`,
    host,
  );
}

/**
 * 담당자 실패 알림.
 *
 * 메일 서비스가 통째로 죽었으면 이 알림도 같이 죽는다. 그 구멍은 어드민 목록의
 * `sync_error` 뱃지가 메운다 — 알림이 유일한 통로가 아니라 목록을 열면 보인다.
 * 그래서 여기서 실패해도 삼킨다.
 */
export async function notifyFailure(subject: string, detail: string): Promise<void> {
  try {
    await transport().sendMail({
      from: env("MAIL_FROM"),
      to: env("MAIL_ADMIN_TO"),
      subject: `[예약 시스템] ${subject}`,
      text: detail,
    });
  } catch {
    // 여기서 더 할 수 있는 일이 없다.
  }
}

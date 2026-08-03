/**
 * 확정·취소 메일 — handoff 5장 "메일 헤더 규약". 발송은 Gmail API 로 한다.
 *
 * 발송 전용 서비스(Resend)를 쓰려면 발신 도메인 DNS 등록이 먼저인데, 그 레코드를
 * 넣어 줄 수 있는 사람이 우리 밖에 있었다. 담당자 로그인이 이미 구글 토큰을
 * 내주므로 거기에 `gmail.send` 한 줄을 얹으면 그 토큰으로 바로 보낼 수 있다 —
 * 새 계정도, 새 비밀 값도, 새 의존성도 없다. SMTP 대신 HTTP 인 이유는 그대로다.
 * 구글 캘린더를 SDK 없이 부른 것과 같다.
 *
 * **그래서 From 이 담당자 본인 주소다.** Gmail 은 인증한 계정 명의로만 보내서
 * 시스템 고정 주소를 쓸 수 없다. 대가로 하나를 잃는다 — 신청자 주소 오타로 생긴
 * 반송이 담당자 개인 받은편지함으로 흩어지고 시스템은 그 실패를 관측하지 못한다
 * (발송 API 는 큐잉 성공이라 `sync_error` 도 안 찍힌다). 반송을 받는 담당자가 그
 * 예약의 당사자라 사람이 먼저 알아챈다는 쪽에 걸었다. From 이 곧 회신 주소가
 * 되므로 `Reply-To` 는 없앴다.
 *
 * 캘린더 초대는 이 규약과 무관하다. 구글이 담당자 계정에서 직접 보낸다.
 */
import { env } from "./env";
import { range } from "./format";

/** `token` 은 담당자 access token 이다 — `connection(member_id).token` 을 그대로 넘긴다. */
export type Host = { name: string; email: string; token: string };

export type MailBooking = {
  id: string;
  startAt: number;
  durationMin: number;
  title: string;
  meetingUrl: string | null;
  guestName: string;
  guestEmail: string;
};

const GMAIL_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

function cancelUrl(id: string): string {
  return `${env("BOOKING_BASE_URL")}/b/cancel/${id}`;
}

/** 한글이 든 헤더는 RFC 2047 로 감싼다 — 원문 그대로 넣으면 제목이 깨진다. */
function header(text: string): string {
  return `=?UTF-8?B?${Buffer.from(text).toString("base64")}?=`;
}

/** RFC 5322 는 한 줄이 998자를 넘지 못한다. 본문은 base64 라 76자로 접는다. */
function body(text: string): string {
  return (Buffer.from(text).toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
}

/**
 * RFC 5322 원문. `from` 을 비우면 구글이 인증한 계정 주소를 채운다 — 실패 알림처럼
 * 담당자 표시 이름을 붙일 이유가 없는 메일에서 쓴다.
 */
function mime(from: string | null, to: string, subject: string, text: string): string {
  const headers = [
    ...(from ? [`From: ${from}`] : []),
    `To: ${to}`,
    `Subject: ${header(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  return `${headers.join("\r\n")}\r\n\r\n${body(text)}`;
}

/** 구글 캘린더와 같은 방식이다 — HTTP 한 번이라 SDK 를 넣지 않는다. */
async function post(token: string, raw: string): Promise<void> {
  const res = await fetch(GMAIL_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(raw).toString("base64url") }),
  });
  if (!res.ok) throw new Error(`메일 발송 실패 ${res.status}: ${await res.text()}`);
}

async function send(to: string, subject: string, text: string, host: Host): Promise<void> {
  const from = `${header(`${host.name} (백패커)`)} <${host.email}>`;
  await post(host.token, mime(from, to, subject, text));
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
 * 메일 경로가 통째로 죽었으면 이 알림도 같이 죽는다. 그 구멍은 어드민 목록의
 * `sync_error` 뱃지가 메운다 — 알림이 유일한 통로가 아니라 목록을 열면 보인다.
 * 그래서 여기서 실패해도 삼킨다.
 */
export async function notifyFailure(token: string, subject: string, detail: string): Promise<void> {
  try {
    await post(token, mime(null, env("MAIL_ADMIN_TO"), `[예약 시스템] ${subject}`, detail));
  } catch {
    // 여기서 더 할 수 있는 일이 없다.
  }
}

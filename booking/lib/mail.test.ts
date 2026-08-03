import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyFailure, sendCanceled, sendConfirmed, type Host, type MailBooking } from "./mail";
import { kstEpoch } from "./slots";

type Call = { url: string; init: RequestInit };

function mockFetch(res: { status?: number; text?: string } = {}): Call[] {
  const calls: Call[] = [];
  const status = res.status ?? 200;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(res.text ?? "{}", { status });
  });
  return calls;
}

/** 나간 요청에서 RFC 5322 원문을 되돌린다. */
function message(call: Call): string {
  const { raw } = JSON.parse(call.init.body as string) as { raw: string };
  return Buffer.from(raw, "base64url").toString();
}

function headers(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\r\n\r\n")[0].split("\r\n")) {
    const at = line.indexOf(": ");
    out[line.slice(0, at)] = line.slice(at + 2);
  }
  return out;
}

/** RFC 2047 `=?UTF-8?B?...?=` 를 푼다. */
function decodeHeader(value: string): string {
  return value.replace(/=\?UTF-8\?B\?(.+?)\?=/g, (_, b64) => Buffer.from(b64, "base64").toString());
}

function bodyLines(raw: string): string[] {
  return raw.split("\r\n\r\n")[1].split("\r\n");
}

function body(raw: string): string {
  return Buffer.from(bodyLines(raw).join(""), "base64").toString();
}

const host: Host = { name: "신장훈", email: "khan@backpac.kr", token: "ya29.token" };

const booking: MailBooking = {
  id: "3f9c1e2a-0000-4000-8000-000000000001",
  startAt: kstEpoch("2026-08-05", 840),
  durationMin: 30,
  title: "사업 협의",
  meetingUrl: null,
  guestName: "홍길동",
  guestEmail: "guest@example.com",
};

beforeEach(() => {
  process.env.BOOKING_BASE_URL = "https://booking.example.com";
  process.env.MAIL_ADMIN_TO = "admin@backpac.kr";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendConfirmed", () => {
  it("담당자 토큰으로 Gmail API 를 부른다 — 신청자와 담당자 두 통이다", async () => {
    const calls = mockFetch();

    await sendConfirmed(booking, host);

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect(calls[0].init.headers).toMatchObject({ authorization: "Bearer ya29.token" });
    expect(headers(message(calls[0])).To).toBe("guest@example.com");
    expect(headers(message(calls[1])).To).toBe("khan@backpac.kr");
  });

  it("From 이 담당자 본인 주소다 — Gmail 은 인증한 계정 명의로만 보낸다", async () => {
    const calls = mockFetch();

    await sendConfirmed(booking, host);

    const from = headers(message(calls[0])).From;
    expect(from).toMatch(/<khan@backpac\.kr>$/);
    expect(decodeHeader(from)).toBe("신장훈 (백패커) <khan@backpac.kr>");
  });

  it("From 이 곧 회신 주소라 Reply-To 를 넣지 않는다", async () => {
    const calls = mockFetch();

    await sendConfirmed(booking, host);

    expect(headers(message(calls[0]))).not.toHaveProperty("Reply-To");
  });

  it("한글 제목을 RFC 2047 로 감싼다 — 원문 그대로 넣으면 깨진다", async () => {
    const calls = mockFetch();

    await sendConfirmed(booking, host);

    const subject = headers(message(calls[0])).Subject;
    expect(subject).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
    expect(decodeHeader(subject)).toContain("[예약 확정]");
    expect(decodeHeader(subject)).toContain("사업 협의");
  });

  it("본문은 UTF-8 base64 다 — 풀면 한글이 그대로 나온다", async () => {
    const calls = mockFetch();

    await sendConfirmed(booking, host);

    const raw = message(calls[0]);
    expect(headers(raw)["Content-Type"]).toBe('text/plain; charset="UTF-8"');
    expect(headers(raw)["Content-Transfer-Encoding"]).toBe("base64");
    expect(body(raw)).toContain("홍길동님, 미팅이 확정되었습니다.");
  });

  it("본문 줄을 76자로 접는다 — RFC 5322 의 998자 한도에 걸리지 않게", async () => {
    const calls = mockFetch();

    await sendConfirmed(booking, host);

    for (const line of bodyLines(message(calls[0]))) {
      expect(line.length).toBeLessThanOrEqual(76);
    }
  });

  it("취소 링크를 본문에 넣는다 — 예약자의 유일한 취소 수단이다", async () => {
    const calls = mockFetch();

    await sendConfirmed(booking, host);

    expect(body(message(calls[0]))).toContain(
      `https://booking.example.com/b/cancel/${booking.id}`,
    );
  });

  it("발송이 실패하면 던진다 — 호출자가 sync_error 를 찍는다", async () => {
    mockFetch({ status: 403, text: "insufficient scope" });
    await expect(sendConfirmed(booking, host)).rejects.toThrow(/403/);
  });
});

describe("sendCanceled", () => {
  it("양쪽에 보낸다", async () => {
    const calls = mockFetch();

    await sendCanceled(booking, host);

    expect(calls.map((c) => headers(message(c)).To)).toEqual([
      "guest@example.com",
      "khan@backpac.kr",
    ]);
  });
});

describe("notifyFailure", () => {
  it("From 을 비운다 — 구글이 인증한 계정 주소를 채운다", async () => {
    const calls = mockFetch();

    await notifyFailure("ya29.token", "확정 메일 발송 실패", "Error: 403");

    expect(headers(message(calls[0]))).not.toHaveProperty("From");
    expect(headers(message(calls[0])).To).toBe("admin@backpac.kr");
    expect(decodeHeader(headers(message(calls[0])).Subject)).toBe(
      "[예약 시스템] 확정 메일 발송 실패",
    );
  });

  it("실패해도 삼킨다 — 어드민 목록의 뱃지가 그 구멍을 메운다", async () => {
    mockFetch({ status: 500, text: "구글이 아픔" });
    await expect(notifyFailure("ya29.token", "무엇", "왜")).resolves.toBeUndefined();
  });
});

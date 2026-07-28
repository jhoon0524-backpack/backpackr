import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accessToken, createEvent, deleteEvent, freeBusy, TokenRevokedError } from "./google";
import { kstEpoch } from "./slots";

type Call = { url: string; init: RequestInit };

/** 응답 하나를 고정해 두고 나간 요청을 모은다. */
function mockFetch(res: { status?: number; body?: unknown; text?: string }): Call[] {
  const calls: Call[] = [];
  const status = res.status ?? 200;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const text = res.text ?? JSON.stringify(res.body ?? {});
    return new Response(status === 204 ? null : text, { status });
  });
  return calls;
}

function form(init: RequestInit): URLSearchParams {
  return init.body as URLSearchParams;
}

function json(init: RequestInit): Record<string, unknown> {
  return JSON.parse(init.body as string);
}

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("accessToken", () => {
  it("refresh token 을 클라이언트 자격증명과 함께 보내고 access token 을 돌려준다", async () => {
    const calls = mockFetch({ body: { access_token: "ya29.token" } });

    expect(await accessToken("1//refresh")).toBe("ya29.token");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://oauth2.googleapis.com/token");
    expect(Object.fromEntries(form(calls[0].init))).toEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      refresh_token: "1//refresh",
      grant_type: "refresh_token",
    });
  });

  it("invalid_grant 은 연동이 끊긴 상태다 — 호출자가 구분할 수 있게 타입을 나눈다", async () => {
    mockFetch({ status: 400, text: '{"error":"invalid_grant"}' });
    await expect(accessToken("1//revoked")).rejects.toBeInstanceOf(TokenRevokedError);
  });

  it("그 밖의 실패는 그냥 실패다", async () => {
    mockFetch({ status: 500, text: "구글이 아픔" });
    const err = accessToken("1//refresh");
    await expect(err).rejects.toThrow(/500/);
    await expect(err).rejects.not.toBeInstanceOf(TokenRevokedError);
  });

  it("클라이언트 자격증명이 없으면 부르지도 않는다", async () => {
    delete process.env.GOOGLE_CLIENT_SECRET;
    const calls = mockFetch({ body: {} });
    await expect(accessToken("1//refresh")).rejects.toThrow(/GOOGLE_CLIENT_SECRET/);
    expect(calls).toHaveLength(0);
  });
});

describe("freeBusy", () => {
  const from = kstEpoch("2026-08-03", 0);
  const to = kstEpoch("2026-08-04", 0);

  it("busy 구간을 epoch ms 로 바꿔 돌려준다", async () => {
    mockFetch({
      body: {
        calendars: {
          primary: {
            busy: [{ start: "2026-08-03T01:00:00Z", end: "2026-08-03T02:00:00Z" }],
          },
        },
      },
    });

    expect(await freeBusy("ya29.token", "primary", from, to)).toEqual([
      { start: Date.parse("2026-08-03T01:00:00Z"), end: Date.parse("2026-08-03T02:00:00Z") },
    ]);
  });

  it("응답 키 이름에 기대지 않는다 — 캘린더를 하나만 물었으므로 값이 하나다", async () => {
    mockFetch({
      body: {
        calendars: {
          "sales@backpac.kr": { busy: [{ start: "2026-08-03T01:00:00Z", end: "2026-08-03T02:00:00Z" }] },
        },
      },
    });

    expect(await freeBusy("ya29.token", "primary", from, to)).toHaveLength(1);
  });

  it("바쁜 구간이 없으면 빈 배열이다", async () => {
    mockFetch({ body: { calendars: { primary: {} } } });
    expect(await freeBusy("ya29.token", "primary", from, to)).toEqual([]);
  });

  it("범위를 ISO 로 담아 한 번만 부른다 — 날짜별로 나눠 부르지 않는다", async () => {
    const calls = mockFetch({ body: { calendars: { primary: { busy: [] } } } });

    await freeBusy("ya29.token", "primary", from, to);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://www.googleapis.com/calendar/v3/freeBusy");
    expect(json(calls[0].init)).toEqual({
      timeMin: new Date(from).toISOString(),
      timeMax: new Date(to).toISOString(),
      items: [{ id: "primary" }],
    });
  });
});

describe("createEvent", () => {
  const draft = {
    summary: "백패커 미팅",
    start: kstEpoch("2026-08-03", 600),
    end: kstEpoch("2026-08-03", 630),
    guestEmail: "guest@example.com",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
  };

  it("이벤트 ID 를 돌려준다", async () => {
    mockFetch({ body: { id: "evt_1" } });
    expect(await createEvent("ya29.token", "primary", draft)).toBe("evt_1");
  });

  it("초대자를 넣고 sendUpdates=all 로 부른다 — 초대 메일은 구글이 보낸다", async () => {
    const calls = mockFetch({ body: { id: "evt_1" } });

    await createEvent("ya29.token", "primary", draft);

    expect(calls[0].url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
    );
    expect(calls[0].init.headers).toMatchObject({ authorization: "Bearer ya29.token" });
    expect(json(calls[0].init)).toMatchObject({
      summary: "백패커 미팅",
      location: draft.meetingUrl,
      start: { dateTime: new Date(draft.start).toISOString() },
      end: { dateTime: new Date(draft.end).toISOString() },
      attendees: [{ email: "guest@example.com" }],
    });
  });

  it("캘린더 ID 가 메일 주소면 경로에 인코딩해 넣는다", async () => {
    const calls = mockFetch({ body: { id: "evt_1" } });

    await createEvent("ya29.token", "sales@backpac.kr", draft);

    expect(calls[0].url).toContain("/calendars/sales%40backpac.kr/events");
  });
});

describe("deleteEvent", () => {
  it("204 면 지워진 것이다", async () => {
    mockFetch({ status: 204 });
    await expect(deleteEvent("ya29.token", "primary", "evt_1")).resolves.toBeUndefined();
  });

  it("이미 지워진 이벤트(410)도 성공으로 본다 — 취소를 되돌릴 이유가 없다", async () => {
    mockFetch({ status: 410, text: "Resource has been deleted" });
    await expect(deleteEvent("ya29.token", "primary", "evt_1")).resolves.toBeUndefined();
  });

  it("그 밖의 실패는 던진다 — 호출자가 sync_error='CAL_DELETE' 를 찍는다", async () => {
    mockFetch({ status: 500, text: "구글이 아픔" });
    await expect(deleteEvent("ya29.token", "primary", "evt_1")).rejects.toThrow(/500/);
  });

  it("취소 통보도 sendUpdates=all 로 나간다", async () => {
    const calls = mockFetch({ status: 204 });

    await deleteEvent("ya29.token", "primary", "evt_1");

    expect(calls[0].url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/evt_1?sendUpdates=all",
    );
    expect(calls[0].init.method).toBe("DELETE");
  });
});

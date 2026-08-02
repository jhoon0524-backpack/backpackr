/**
 * 구글 캘린더 클라이언트 — handoff "구글 캘린더를 SDK 없이 부르는 이유".
 *
 * `google-api-services-calendar` 계열 SDK 는 트랜지티브 의존성이 큰데 여기서
 * 실제로 쓰는 건 아래 네 호출뿐이다. 응답에서 꺼내는 필드도 `access_token`·
 * `calendars[].busy[]`·`id` 셋이라 fetch 로 직접 부른다.
 *
 * 핸드오프에 있던 **동의 화면과 코드 교환은 여기 없다.** 담당자 로그인이 곧
 * 구글 OAuth 라 Supabase Auth 가 그 두 단계를 한다. 우리는 로그인 때 받은
 * refresh token 을 보관했다가 여기서 access token 으로 바꿔 쓴다.
 */
import { env } from "./env";
import type { BusyPeriod } from "./slots";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_URL = "https://www.googleapis.com/calendar/v3";

/**
 * 로그인 때 요청하는 스코프. 전체 권한(`.../auth/calendar`)은 넣지 않는다 —
 * 이 두 개로 아래 호출이 전부 커버된다.
 */
export const SCOPES = [
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.events",
];

/**
 * 담당자가 구글에서 연동을 끊었거나 토큰이 만료된 상태.
 *
 * 에러가 아니라 상태다 — 공개 페이지는 이걸 받으면 `bookable: false` 를 내려
 * 안내 문구를 렌더한다. 호출자가 구분할 수 있어야 해서 타입을 따로 둔다.
 */
export class TokenRevokedError extends Error {}

async function call(url: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`구글 호출 실패 ${res.status} ${url}: ${await res.text()}`);
  }
  return res.json();
}

function authed(token: string, body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

/** refresh token → access token. 만료가 한 시간이라 매 요청 새로 받는다. */
export async function accessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      client_secret: env("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const text = await res.text();
  // 연동 해제·비밀번호 변경·토큰 만료가 전부 400 invalid_grant 로 온다.
  if (res.status === 400 && text.includes("invalid_grant")) {
    throw new TokenRevokedError("구글 연동이 끊겼다");
  }
  if (!res.ok) throw new Error(`토큰 갱신 실패 ${res.status}: ${text}`);
  return (JSON.parse(text) as { access_token: string }).access_token;
}

/** 담당자 캘린더의 바쁨 구간. 요청당 1회 부른다 — 날짜별로 나눠 부르지 않는다. */
export async function freeBusy(
  token: string,
  calendarId: string,
  from: number,
  to: number,
): Promise<BusyPeriod[]> {
  const json = (await call(
    `${CALENDAR_URL}/freeBusy`,
    authed(token, {
      timeMin: new Date(from).toISOString(),
      timeMax: new Date(to).toISOString(),
      items: [{ id: calendarId }],
    }),
  )) as { calendars: Record<string, { busy?: { start: string; end: string }[] }> };

  // 캘린더 하나만 물었으므로 응답도 하나다. 키 이름(`primary` 인지 실제 ID 인지)에
  // 기대지 않고 값을 그대로 꺼낸다.
  const [calendar] = Object.values(json.calendars);
  return (calendar?.busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

export type EventDraft = {
  summary: string;
  description?: string;
  /** epoch ms */
  start: number;
  /** epoch ms */
  end: number;
  guestEmail: string;
  /** 화상 미팅 링크. 이벤트 장소로 들어간다 */
  meetingUrl?: string;
};

/** 이벤트 생성 + 초대. 초대 메일은 담당자 계정에서 구글이 직접 보낸다. */
export async function createEvent(
  token: string,
  calendarId: string,
  draft: EventDraft,
): Promise<string> {
  const json = (await call(
    `${CALENDAR_URL}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    authed(token, {
      summary: draft.summary,
      description: draft.description,
      location: draft.meetingUrl,
      start: { dateTime: new Date(draft.start).toISOString() },
      end: { dateTime: new Date(draft.end).toISOString() },
      attendees: [{ email: draft.guestEmail }],
    }),
  )) as { id: string };
  return json.id;
}

/** 이벤트 삭제 + 취소 통보. 이미 지워진 이벤트(410)는 성공으로 본다. */
export async function deleteEvent(
  token: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(
    `${CALENDAR_URL}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    { method: "DELETE", headers: { authorization: `Bearer ${token}` } },
  );
  if (res.ok || res.status === 410) return;
  throw new Error(`이벤트 삭제 실패 ${res.status}: ${await res.text()}`);
}

/**
 * 담당자 캘린더 연동 — `calendar_token` 한 행의 수명.
 *
 * **행의 존재 여부가 곧 연동 상태다.** 상태 컬럼도, 해제 시각도 두지 않는다.
 * 구글이 토큰을 거절하면 행을 지운다 — 남겨두면 화면에는 연동됨으로 보이는데
 * 슬롯은 안 나오는, 담당자가 고칠 방법이 없는 상태가 된다.
 */
import { seal, unseal } from "./crypto";
import { accessToken, TokenRevokedError } from "./google";
import { db } from "./supabase";

/** 담당자 기본 캘린더를 가리키는 예약어. 실제 ID 를 조회할 필요가 없다. */
const PRIMARY = "primary";

export async function connect(memberId: string, refreshToken: string): Promise<void> {
  const { error } = await db()
    .from("calendar_token")
    .upsert({
      member_id: memberId,
      refresh_token: seal(refreshToken).toString("base64"),
      calendar_id: PRIMARY,
    });
  if (error) throw new Error(`연동 저장 실패: ${error.message}`);
}

export async function disconnect(memberId: string): Promise<void> {
  const { error } = await db().from("calendar_token").delete().eq("member_id", memberId);
  if (error) throw new Error(`연동 해제 실패: ${error.message}`);
}

export type Connection = { token: string; calendarId: string };

/**
 * 쓸 수 있는 access token. 미연동이거나 구글이 거절하면 null.
 *
 * null 은 에러가 아니라 상태다 — 공개 페이지는 이걸 받아 `bookable: false` 를 내린다.
 */
export async function connection(memberId: string): Promise<Connection | null> {
  const { data } = await db()
    .from("calendar_token")
    .select("refresh_token, calendar_id")
    .eq("member_id", memberId)
    .maybeSingle();
  if (!data) return null;

  try {
    return {
      token: await accessToken(unseal(Buffer.from(data.refresh_token, "base64"))),
      calendarId: data.calendar_id,
    };
  } catch (e) {
    if (!(e instanceof TokenRevokedError)) throw e;
    await disconnect(memberId);
    return null;
  }
}

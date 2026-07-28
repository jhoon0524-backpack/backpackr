/**
 * OAuth 콜백 — handoff API 7 자리다.
 *
 * 코드 교환은 Supabase 가 하고, 우리가 하는 일은 **그 세션에 딸려 온
 * provider_refresh_token 을 붙잡아 봉인해 두는 것** 하나다. 이 토큰은 로그인
 * 순간의 세션에만 실려 온다 — 여기서 놓치면 다시 받을 방법이 재로그인뿐이다.
 */
import { NextResponse, type NextRequest } from "next/server";

import { connect } from "@/lib/calendar";
import { db } from "@/lib/supabase";
import { auth } from "@/lib/supabase";

function back(origin: string, error?: string) {
  return NextResponse.redirect(new URL(error ? `/admin?error=${error}` : "/admin", origin));
}

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;

  // 담당자가 동의 화면에서 취소한 경우
  if (searchParams.get("error")) return back(origin, "consent_denied");

  const code = searchParams.get("code");
  if (!code) return back(origin, "no_code");

  const { data, error } = await (await auth()).auth.exchangeCodeForSession(code);
  if (error || !data.session) return back(origin, "exchange_failed");

  const refreshToken = data.session.provider_refresh_token;
  if (refreshToken) {
    await connect(data.session.user.id, refreshToken);
    return back(origin);
  }

  // 구글이 refresh token 을 안 준 경우. prompt=consent 를 보내므로 정상 경로에서는
  // 오지 않지만, 왔는데 기존 연동도 없으면 로그인만 되고 슬롯이 영영 안 나온다.
  // 그 상태를 성공으로 넘기지 않는다.
  const { data: existing } = await db()
    .from("calendar_token")
    .select("member_id")
    .eq("member_id", data.session.user.id)
    .maybeSingle();

  return back(origin, existing ? undefined : "no_refresh_token");
}

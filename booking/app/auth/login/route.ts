/**
 * 담당자 로그인 — handoff API 6(`/admin/api/calendar/connect`) 자리다.
 *
 * **로그인과 캘린더 연동이 한 번에 끝난다.** 구글로 로그인하면 그 계정이 곧
 * 연동 대상이라 "로그인 먼저, 연동은 나중에" 라는 두 단계가 없다. 그래서 경로도
 * `/admin/api/calendar/connect` 가 아니라 `/auth/login` 이다.
 */
import { NextResponse, type NextRequest } from "next/server";

import { SCOPES } from "@/lib/google";
import { auth } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;

  const { data, error } = await (await auth()).auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: SCOPES.join(" "),
      // access_type=offline 이 없으면 refresh token 이 오지 않는다. 연동 직후에는
      // 멀쩡하다가 한 시간 뒤 슬롯 조회가 통째로 죽는다. prompt=consent 는 재연동
      // 때도 refresh token 을 다시 받기 위해 필요하다.
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/admin?error=login_failed", origin));
  }
  return NextResponse.redirect(data.url);
}

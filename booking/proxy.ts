/**
 * 담당자 세션 갱신. Next 16 에서 middleware 는 proxy 로 이름이 바뀌었다.
 *
 * 서버 컴포넌트는 쿠키를 쓸 수 없어서 세션이 만료되면 갱신할 자리가 없다.
 * 그 자리를 여기가 맡는다 — 없으면 담당자가 임의로 로그아웃되는 형태로 나타난다.
 *
 * 공개 예약 페이지는 세션을 보지 않으므로 matcher 를 `/admin` 으로 좁힌다.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // 이 호출이 갱신을 일으킨다. 결과는 쓰지 않는다 — 인증 판단은 각 라우트가 한다.
  await supabase.auth.getUser();

  return response;
}

export const config = { matcher: ["/admin/:path*"] };

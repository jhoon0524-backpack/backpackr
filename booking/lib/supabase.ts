/**
 * Supabase 클라이언트 둘. 쓰는 키가 다르고 쓰는 자리가 다르다.
 *
 *   db()   — service role 키. 모든 데이터 접근이 여기를 지난다. 스키마에 RLS 를
 *            켜고 정책을 두지 않았으므로 anon 키로는 아무것도 읽히지 않는다.
 *   auth() — anon 키 + 쿠키. 담당자가 누구인지만 본다. 데이터는 읽지 않는다.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { env } from "./env";

export function db(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

/** 요청마다 새로 만든다. 요청 간에 공유하면 세션이 섞인다. */
export async function auth(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            // 서버 컴포넌트에서는 쿠키를 못 쓴다. 세션 갱신은 proxy.ts 가 한다.
          }
        },
      },
    },
  );
}

/** 로그인한 담당자. 없으면 null */
export async function host(): Promise<User | null> {
  const { data } = await (await auth()).auth.getUser();
  return data.user;
}

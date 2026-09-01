import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { UserSwitcher } from "./user-switcher";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dropbid",
  description: "종료된 창작 굿즈를 경매로 거래합니다",
};

// CSS 가 오기 전에도 브라우저가 밝은 바탕을 깔도록 알린다.
// 이게 없으면 어두운 테마 기기에서 첫 순간 검은 화면이 번쩍인다.
export const viewport: Viewport = { colorScheme: "light" };

const NAV = [
  { href: "/", label: "드롭" },
  { href: "/sell", label: "상품 등록" },
  { href: "/me", label: "마이페이지" },
] as const;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // "검수" 는 운영자에게만 보인다. 일반 사용자에게 보일 이유가 없다.
  const me = await getCurrentUser();
  const nav = me?.is_operator ? [...NAV, { href: "/admin", label: "검수" }] : NAV;
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-baseline gap-4">
              <Link href="/" className="text-xl font-bold tracking-tight text-ink">
                Drop<span className="text-urgent">bid</span>
              </Link>
              <nav className="flex gap-3 text-sm text-strong">
                {nav.map((n) => (
                  <Link key={n.href} href={n.href} className="hover:text-ink">
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
            <UserSwitcher />
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6">{children}</main>
      </body>
    </html>
  );
}

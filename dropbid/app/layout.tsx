import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { UserSwitcher } from "./user-switcher";

export const metadata: Metadata = {
  title: "Dropbid",
  description: "종료된 창작 굿즈를 경매로 거래합니다",
};

const NAV = [
  { href: "/", label: "드롭" },
  { href: "/sell", label: "상품 등록" },
  { href: "/me", label: "마이페이지" },
  { href: "/admin", label: "검수" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-baseline gap-4">
              <Link href="/" className="text-lg font-semibold tracking-tight">Dropbid</Link>
              <nav className="flex gap-3 text-sm text-zinc-600">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="hover:text-zinc-900">
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

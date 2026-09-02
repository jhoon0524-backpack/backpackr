import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { UserSwitcher } from "./user-switcher";

export const metadata: Metadata = {
  title: "커미션",
  description: "창작자에게 맞춤 작업을 의뢰합니다",
};

// CSS 가 오기 전에도 브라우저가 밝은 바탕을 깔도록 알린다.
// 이게 없으면 어두운 테마 기기에서 첫 순간 검은 화면이 번쩍인다.
export const viewport: Viewport = { colorScheme: "light" };

const NAV = [
  { href: "/", label: "커미션" },
  { href: "/open", label: "커미션 열기" },
  { href: "/me", label: "마이페이지" },
] as const;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-baseline gap-4">
              <Link href="/" className="text-xl font-bold tracking-tight text-ink">
                커미션<span className="text-urgent">.</span>
              </Link>
              <nav className="flex gap-3 text-sm text-strong">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>
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

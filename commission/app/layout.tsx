import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { UserSwitcher } from "./user-switcher";

export const metadata: Metadata = {
  title: "커미션",
  description: "창작자에게 맞춤 작업을 의뢰합니다",
};

// CSS 가 오기 전에도 브라우저가 밝은 바탕을 깔도록 알린다.
export const viewport: Viewport = { colorScheme: "light" };

// 헤더의 사용자 전환기가 DB 를 읽는다. 빌드 때 404 페이지를 미리 그리려다 DB 에 붙지 못해 실패했다.
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "둘러보기" },
  { href: "/open", label: "작업실 열기" },
  { href: "/me", label: "내 페이지" },
] as const;

/**
 * "작업실" 방향 (design 캔버스 A안). 종이색 바탕, 명조 로고, 아래 먹색 괘선 한 줄.
 * 텀블벅 카드 틀 대신 잡지의 작품 목록처럼 읽히게 한다. 폭은 1100.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 이 규칙은 pages/ 시절 것이다. App Router 의 루트 레이아웃은 모든 화면에 실리므로 경고가 맞지 않는다. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <header className="sticky top-0 z-10 bg-paper">
          <div className="mx-auto max-w-[1100px] px-5">
            <div className="flex h-16 items-center justify-between gap-4 border-b-[1.5px] border-ink">
              <div className="flex items-center gap-8">
                <Link href="/" className="serif flex h-16 items-center text-[24px] font-bold tracking-tight text-ink">
                  커미션
                </Link>
                <nav className="hidden gap-6 text-[14px] font-medium text-ink sm:flex">
                  {NAV.map((n) => (
                    <Link key={n.href} href={n.href} className="flex h-16 items-center hover:text-accent">{n.label}</Link>
                  ))}
                </nav>
              </div>
              <UserSwitcher />
            </div>
            {/* 좁은 화면의 길. 높이 44 탭 세 개. */}
            <nav className="flex border-b border-line sm:hidden">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="flex h-11 flex-1 items-center justify-center text-sm font-medium text-ink">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-[1100px] px-5">
          <div className="flex items-center justify-between border-t border-ink py-6 text-xs text-muted">
            <p className="serif">커미션 — 창작자 맞춤 작업 의뢰</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

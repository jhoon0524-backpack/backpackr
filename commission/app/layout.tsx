import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { UserSwitcher } from "./user-switcher";

export const metadata: Metadata = {
  title: "커미션!",
  description: "창작자에게 맞춤 작업을 의뢰합니다",
};

export const viewport: Viewport = { colorScheme: "light" };

// 헤더의 사용자 전환기가 DB 를 읽는다. 빌드 때 미리 그리지 않는다.
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "메뉴판" },
  { href: "/open", label: "메뉴 붙이기" },
  { href: "/me", label: "내 것" },
] as const;

/**
 * "게시판" 방향. 검정 3px 선과 딱딱한 그림자로 짠 판.
 *
 * **노랑은 화면에 한 번만 나온다.** 머리와 바닥에 같은 노랑을 깔면 두 덩어리가 서로 주인공을 다투고
 * 그 사이 흰 곳은 디자인이 없는 자리처럼 읽힌다. 머리는 흰 바탕에 검정 밑줄, 로고만 노랑 칩으로 두고,
 * 진짜 노랑 한 판은 아래 권유 상자에 몰아 준다.
 *
 * 전광판은 걷어냈다. 바로 400px 아래 카드가 말하는 것을 한 번 더 흘려보내는 장식이었다.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-ink">
        <header className="sticky top-0 z-10 border-b-[3px] border-ink bg-white">
          <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-4 px-8">
            <div className="flex items-center gap-7">
              <Link href="/" className="disp flex h-16 items-center text-[26px] leading-none text-ink">
                <span className="bg-yellow px-2 pb-1 pt-1.5">커미션!</span>
              </Link>
              <nav className="hidden gap-5 text-[15px] font-bold text-ink sm:flex">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="flex h-16 min-w-11 items-center justify-center hover:underline hover:decoration-[3px] hover:underline-offset-4">
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
            <UserSwitcher />
          </div>
          {/* 좁은 화면의 길. 높이 44 탭 세 개. */}
          <nav className="flex border-t-[3px] border-ink sm:hidden">
            {NAV.map((n, i) => (
              <Link key={n.href} href={n.href} className={`flex h-11 flex-1 items-center justify-center text-sm font-bold text-ink ${i > 0 ? "border-l-[3px] border-ink" : ""}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1100px] flex-1 px-8 pt-12 pb-18">{children}</main>
        {/* 바닥은 머리를 되비춘다 — 왼쪽 로고, 오른쪽 길. 한쪽만 채우면 잘려 끝난 것처럼 보인다. */}
        <footer className="border-t-[3px] border-ink bg-white">
          <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 px-8 py-7">
            <p className="flex items-baseline gap-3 text-xs font-medium text-muted">
              <span className="disp text-base leading-none text-ink">커미션!</span>
              창작자 맞춤 작업 의뢰
            </p>
            <p className="text-xs font-medium text-muted">© 2026 커미션</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

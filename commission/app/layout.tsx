import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { HeaderNav } from "./header-nav";
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
        {/*
          글꼴은 이 서비스가 직접 들고 있다 — 이유는 public/fonts/fonts.css 머리말에.
          Next 는 스타일시트를 손으로 넣지 말라고 하지만, 그건 번들러가 아는 CSS 를 말한다.
          이 파일은 88개 subset 을 가리키는 @font-face 목록이라 번들에 넣을 것이 아니라 그대로 받아 가야 한다.
        */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link href="/fonts/fonts.css" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col overflow-x-hidden bg-white text-ink">
        <header className="sticky top-0 z-10 bg-ink text-white">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-8">
            <div className="flex items-center gap-7">
              <Link href="/" className="poster flex h-16 items-center text-[34px] leading-none">
                커미션<span className="text-yellow">!</span>
              </Link>
              <HeaderNav items={NAV} />
            </div>
            <UserSwitcher />
          </div>
          {/* 좁은 화면의 길. 높이 44 탭 세 개. */}
          <nav className="flex border-t-[3px] border-white/20 sm:hidden">
            {NAV.map((n, i) => (
              <Link key={n.href} href={n.href} className={`flex h-11 flex-1 items-center justify-center text-sm font-bold ${i > 0 ? "border-l-[3px] border-white/20" : ""}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-8 pb-2 pt-0">{children}</main>
        {/* 바닥은 머리를 되비춘다 — 왼쪽 로고, 오른쪽 길. 한쪽만 채우면 잘려 끝난 것처럼 보인다. */}
        <footer className="border-t-[3px] border-ink bg-ink text-white">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-8 py-7">
            <p className="poster text-[26px] leading-none">커미션<span className="text-yellow">!</span></p>
            <p className="num text-[13px] font-bold text-white/50">© 2026 커미션</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

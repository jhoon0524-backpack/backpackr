import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { listOpenCommissions } from "@/lib/db";
import { UserSwitcher } from "./user-switcher";

export const metadata: Metadata = {
  title: "커미션!",
  description: "창작자에게 맞춤 작업을 의뢰합니다",
};

// CSS 가 오기 전에도 브라우저가 밝은 바탕을 깔도록 알린다.
export const viewport: Viewport = { colorScheme: "light" };

// 헤더의 사용자 전환기와 전광판 띠가 DB 를 읽는다. 빌드 때 미리 그리지 않는다.
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "메뉴판" },
  { href: "/open", label: "메뉴 붙이기" },
  { href: "/me", label: "내 것" },
] as const;

/**
 * "게시판" 방향 (design 캔버스 B안). 형광 노랑 머리, 검정 3px 밑줄, 그 아래 검정 전광판 띠가
 * 지금 열린 메뉴와 남은 자리를 한 줄로 읊는다. 대학가 게시판에 붙은 전단 느낌.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const open = await listOpenCommissions();
  const ticker = [
    `지금 ${open.length}개 열림`,
    ...open.map((c) => {
      const left = c.max_slots - c.active_count;
      return `${c.title} ${left > 0 ? `${left}자리` : "자리 없음"}`;
    }),
    "보내는 건 무료",
  ];
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 이 규칙은 pages/ 시절 것이다. App Router 의 루트 레이아웃은 모든 화면에 실리므로 경고가 맞지 않는다. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-white text-ink">
        <header className="sticky top-0 z-10">
          <div className="border-b-[3px] border-ink bg-yellow">
            <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-4">
              <div className="flex items-center gap-6">
                <Link href="/" className="disp flex h-14 items-center text-[28px] text-ink">커미션!</Link>
                <nav className="hidden gap-5 text-[15px] font-bold text-ink sm:flex">
                  {NAV.map((n) => (
                    <Link key={n.href} href={n.href} className="flex h-14 items-center hover:underline hover:decoration-[3px]">{n.label}</Link>
                  ))}
                </nav>
              </div>
              <UserSwitcher />
            </div>
          </div>
          {/* 전광판. 글자는 노랑, 바탕은 검정. 넘치면 가로로 스크롤되지만 화면은 넘치지 않는다. */}
          <div className="overflow-hidden border-b-[3px] border-ink bg-ink py-1.5 text-[13px] font-bold tracking-wide text-yellow" aria-label={ticker.join(", ")}>
            <div className="ticker num" aria-hidden>
              <span>{ticker.join("  ·  ")}  ·</span>
              <span>{ticker.join("  ·  ")}  ·</span>
            </div>
          </div>
          {/* 좁은 화면의 길. 높이 44 탭 세 개. */}
          <nav className="flex border-b-[3px] border-ink bg-white sm:hidden">
            {NAV.map((n, i) => (
              <Link key={n.href} href={n.href} className={`flex h-11 flex-1 items-center justify-center text-sm font-bold text-ink ${i > 0 ? "border-l-[3px] border-ink" : ""}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-7">{children}</main>
        <footer className="border-t-[3px] border-ink bg-yellow">
          <div className="mx-auto max-w-[1100px] px-4 py-5 text-xs font-bold text-ink">
            <p className="disp text-lg">커미션!</p>
            <p>창작자 맞춤 작업 의뢰</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

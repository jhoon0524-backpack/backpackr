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
// 어차피 모든 화면이 요청마다 그려지므로 레이아웃도 그렇게 못박는다.
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "커미션 둘러보기" },
  { href: "/me", label: "마이페이지" },
] as const;

/**
 * 텀블벅 GNB 를 따랐다 — 흰 바탕, 아래 1px 구분선, 왼쪽 로고와 메뉴, 오른쪽에
 * "프로젝트 올리기" 자리의 "커미션 열기" 와 "로그인" 자리의 사용자 전환기.
 * 폭은 텀블벅과 같은 1200 이다. 카드 4열이 딱 들어간다.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-ink">
        <header className="sticky top-0 z-10 border-b border-line bg-white">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex h-16 items-center gap-1.5 text-[22px] font-extrabold tracking-tight text-ink">
                <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
                커미션
              </Link>
              <nav className="hidden gap-6 text-[15px] font-medium text-ink sm:flex">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="flex h-16 items-center hover:text-accent-deep">{n.label}</Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/open" className="hidden h-16 items-center text-[15px] font-medium text-ink hover:text-accent-deep sm:flex">
                커미션 열기
              </Link>
              <UserSwitcher />
            </div>
          </div>
          {/*
            좁은 화면의 길. 전에는 바닥글 12px 링크가 유일해서 상세에서 1,200px 을 내려가야 마이페이지로 갈 수 있었다
            (UI/UX 1회차 발견 4). 텀블벅 모바일도 머리 아래에 탭 줄을 둔다. 높이 44.
          */}
          <nav className="flex border-t border-line sm:hidden">
            {[...NAV, { href: "/open", label: "커미션 열기" }].map((n) => (
              <Link key={n.href} href={n.href} className="flex h-11 flex-1 items-center justify-center text-sm font-medium text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-8">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-5 py-6 text-xs text-muted">
            <p>커미션 — 창작자 맞춤 작업 의뢰</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

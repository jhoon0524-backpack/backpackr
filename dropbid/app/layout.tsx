import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dropbid",
  description: "종료된 창작 굿즈를 경매로 거래합니다",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-baseline gap-3 px-5 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">Dropbid</Link>
            <span className="text-xs text-zinc-500">종료된 펀딩 굿즈 경매</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6">{children}</main>
      </body>
    </html>
  );
}

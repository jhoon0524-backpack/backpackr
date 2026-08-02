import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "미팅 예약 링크",
  description: "비어 있는 시간을 골라 미팅을 확정합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 폰트는 globals.css 의 --sans·--serif·--mono 가 정한다. 목업이 시스템 폰트
  // 스택을 쓰므로 웹폰트를 받아오지 않는다.
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "미팅 예약 링크",
  description: "비어 있는 시간을 골라 미팅을 확정합니다.",
};

/*
 * 브랜드 토큰의 다크 모드는 `html.dark` 로 켜진다(next-themes 규약). 이 앱에는
 * 테마 토글이 없어서 OS 설정을 읽어 클래스만 붙인다. 렌더 전에 돌아야 밝은
 * 화면이 한 번 번쩍이지 않는다.
 */
const APPLY_DARK = `try{if(matchMedia("(prefers-color-scheme:dark)").matches)document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // 폰트는 브랜드 토큰이 정한다 — Pretendard 를 CDN 에서 받는다.
  return (
    <html lang="ko">
      <body>
        <script dangerouslySetInnerHTML={{ __html: APPLY_DARK }} />
        {children}
      </body>
    </html>
  );
}

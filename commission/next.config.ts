import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * 빌드 폴더를 환경변수로 바꿀 수 있게 열어 둔다. 기본은 그대로 `.next` 다.
   *
   * 화면을 띄워 두고 검수하는 동안 다른 쪽에서 빌드하면, 돌고 있는 서버가 읽던 청크가
   * 지워져 화면이 깨진다. 검수용 서버와 작업용 서버를 따로 돌릴 때만 쓴다 —
   *   NEXT_DIST_DIR=.next-design npm run build && NEXT_DIST_DIR=.next-design npx next start -p 3200
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;

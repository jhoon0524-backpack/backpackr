import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // tsconfig 의 `@/*` 별칭 해석. Vite 가 네이티브로 지원하므로 vite-tsconfig-paths 는 쓰지 않는다.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    // DB 테스트 파일들이 데이터베이스 하나를 같이 쓴다. 병렬로 돌면 서로의 스키마를 지우고
    // 서로의 데이터를 truncate 한다. 파일 단위로 순서대로 돌린다.
    // 스위트가 커져서 느려지면 파일마다 별도 DB 를 주는 쪽으로 바꿔야 한다.
    fileParallelism: false,
  },
})

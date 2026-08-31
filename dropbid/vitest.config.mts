import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // tsconfig 의 `@/*` 별칭 해석. Vite 가 네이티브로 지원하므로 vite-tsconfig-paths 는 쓰지 않는다.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
  },
})

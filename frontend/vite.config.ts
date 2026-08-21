import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  // 워크트리마다 node_modules 가 master 를 가리키는 심볼릭 링크라
  // 기본 cacheDir(node_modules/.vite) 이 워크트리 사이에 공유된다.
  // 워크트리 안쪽으로 분리해 config 차이·동시 dev 서버 충돌을 예방한다.
  cacheDir: '.vite-cache',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // tsconfig.app.json 의 paths 와 반드시 같은 값을 유지한다.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // MSW 를 껐을 때(VITE_ENABLE_MSW=false) 실제 백엔드로 넘기는 폴백 경로.
      '/api': {
        target: process.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});

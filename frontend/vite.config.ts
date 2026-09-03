/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
// vitest 는 이 파일을 그대로 읽는다(별도 vitest.config.ts 를 두지 않는 이유) — dev 서버와
// 같은 alias 를 테스트에서도 그대로 쓴다. jsdom 을 쓰는 이유는 화면 테스트가 아니라
// `shared/config/env.ts`가 모듈 최상단에서 `window.location.origin`을 읽어서다 —
// httpClient 를 import 하기만 해도 그 모듈이 함께 로드되므로 Node 환경은 그 자리에서 죽는다.
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
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

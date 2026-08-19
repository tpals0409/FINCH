import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import '@/styles/index.css';

/**
 * MSW 는 반드시 동적 import 로만 연다.
 * 정적 import 면 트리셰이킹이 되지 않아 프로덕션 번들에 목 코드가 들어간다.
 * 그리고 render 보다 먼저 await 해야 첫 쿼리가 워커 등록과 경합하지 않는다.
 *
 * `import.meta.env.DEV` 를 여기 직접 적는 이유가 있다. 번들러는 이 표현을
 * 리터럴 false 로 치환해 블록 전체를 지운다. 다른 모듈에서 불린으로 감싸
 * 가져오면 치환이 블록까지 닿지 않아 MSW 청크가 프로덕션에 남는다.
 */
async function enableMocking(): Promise<void> {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW !== 'false') {
    const { worker } = await import('@/mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
}

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('#root 엘리먼트를 찾을 수 없습니다');
}

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

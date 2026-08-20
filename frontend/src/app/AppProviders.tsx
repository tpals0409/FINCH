import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useState, type ReactNode } from 'react';

import { createQueryClient } from '@/shared/api';

import { AppErrorBoundary } from './AppErrorBoundary';

/**
 * devtools 도 개발 전용이다. 정적 import 로 두면 프로덕션 번들에 들어간다.
 * `import.meta.env.DEV` 를 이 파일에 직접 적어야 번들러가 블록을 지운다.
 */
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null;

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  // 초기화 함수로 넘긴다. inline 으로 호출하면 StrictMode 이중 마운트에서
  // QueryClient 가 새로 만들어져 캐시가 날아간다.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>{children}</AppErrorBoundary>
      {ReactQueryDevtools === null ? null : (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

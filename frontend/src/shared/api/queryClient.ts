import { QueryClient } from '@tanstack/react-query';

import { HttpError, SchemaError } from './errors';

const MAX_RETRY_COUNT = 2;

/**
 * 재시도 정책 (컨벤션 §5).
 * - 스키마 실패는 재시도하지 않는다. 다시 보내도 같은 응답이 온다
 * - 429 는 재시도한다. 대기 시간은 retryDelay 에서 Retry-After 를 우선한다
 * - 나머지 4xx 는 재시도하지 않는다
 * - 5xx 와 네트워크 오류는 지수 백오프로 최대 2회
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof SchemaError) {
    return false;
  }
  if (failureCount >= MAX_RETRY_COUNT) {
    return false;
  }
  if (error instanceof HttpError) {
    if (error.status === 429) {
      return true;
    }
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
  }
  return true;
}

function getRetryDelay(attemptIndex: number, error: unknown): number {
  const backoffMs = Math.min(1000 * 2 ** attemptIndex, 30_000);
  // 429 는 서버가 알려준 대기 시간이 지수 백오프보다 우선한다.
  if (error instanceof HttpError && error.retryAfterMs !== null) {
    return error.retryAfterMs;
  }
  return backoffMs;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: getRetryDelay,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // 기본값에 기대지 않는다 (컨벤션 §8).
        // 쿼리 에러는 컴포넌트가 직접 그리고, 에러 경계로 올리지 않는다.
        throwOnError: false,
      },
      mutations: {
        // 주문 요청을 자동 재시도하면 중복 주문이 된다 (컨벤션 §5).
        retry: false,
        throwOnError: false,
      },
    },
  });
}

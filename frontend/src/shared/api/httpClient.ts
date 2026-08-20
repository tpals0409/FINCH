import { type z } from 'zod';

import { API_BASE_URL } from '@/shared/config/env';

import { HttpError, SchemaError, parseRetryAfterMs } from './errors';

type RequestOptions = {
  /** 응답 본문을 검증할 Zod 스키마. 검증을 통과한 값만 밖으로 나간다. */
  schema: z.ZodType<unknown>;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

function buildUrl(path: string): string {
  const base = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

/**
 * 단일 HTTP 클라이언트 (컨벤션 §5).
 * 컴포넌트는 fetch 를 직접 부르지 않는다. 이 함수가 유일한 통로다.
 * 응답은 Zod 로 검증한 뒤에만 반환하고, 실패는 HttpError / SchemaError 로
 * 정규화해 던진다.
 */
export async function request<TSchema extends z.ZodType<unknown>>(
  path: string,
  options: RequestOptions & { schema: TSchema },
): Promise<z.infer<TSchema>> {
  const { schema, method = 'GET', body, signal } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      signal,
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    // 상태 코드 0 은 "응답 자체가 없었다"는 뜻으로 쓴다.
    throw new HttpError(0, '네트워크에 연결할 수 없습니다', null);
  }

  if (!response.ok) {
    throw new HttpError(
      response.status,
      '요청을 처리하지 못했습니다',
      parseRetryAfterMs(response.headers.get('Retry-After')),
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new SchemaError('응답 본문이 JSON 이 아닙니다', cause);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new SchemaError('응답이 명세와 다릅니다', parsed.error.issues);
  }

  return parsed.data as z.infer<TSchema>;
}

import { type z } from 'zod';

import { API_BASE_PATH } from '@/shared/config/apiContract';
import { API_BASE_URL } from '@/shared/config/env';
import { parseErrorResponse } from '@/shared/types/error';

import { HttpError, SchemaError, parseRetryAfterMs } from './errors';

type RequestOptions = {
  /** 응답 본문을 검증할 Zod 스키마. 검증을 통과한 값만 밖으로 나간다. */
  schema: z.ZodType<unknown>;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

const FALLBACK_ERROR_MESSAGE = '요청을 처리하지 못했습니다';

/**
 * `{origin}{/api/v1}{path}` 로 조립한다. 호출부는 API_PATHS 의 뒷부분만 넘긴다.
 * 접두를 환경변수가 아니라 상수로 두는 이유는 이것이 환경이 아니라 계약이기 때문이다
 * (apiSpec §1.1).
 */
function buildUrl(path: string): string {
  const origin = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${API_BASE_PATH}${suffix}`;
}

/**
 * 실패 응답을 정규화한다 (컨벤션 §5).
 * message 는 서버가 완성해 주는 사용자 노출 문구라 화면이 문구를 다시 만들지 않는다.
 * 우리 에러 형식이 아니면 code 없이 기본 문구로 떨어진다.
 */
async function toHttpError(response: Response): Promise<HttpError> {
  const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'));

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    // 본문이 비었거나 JSON 이 아니다. 에러를 읽다가 다시 던지지 않는다.
    return new HttpError({
      status: response.status,
      message: FALLBACK_ERROR_MESSAGE,
      retryAfterMs,
    });
  }

  const parsed = parseErrorResponse(payload);
  if (parsed === null) {
    return new HttpError({
      status: response.status,
      message: FALLBACK_ERROR_MESSAGE,
      retryAfterMs,
    });
  }

  return new HttpError({
    status: response.status,
    message: parsed.message,
    retryAfterMs,
    code: parsed.code,
    detail: parsed.detail ?? null,
  });
}

/**
 * 단일 HTTP 클라이언트 (컨벤션 §5). 컴포넌트는 fetch 를 직접 부르지 않는다.
 * 응답은 Zod 로 검증한 뒤에만 반환하고, 실패는 HttpError / SchemaError 로 던진다.
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
      // 기본값 same-origin 이면 교차 출처에서 Refresh 쿠키의 Set-Cookie 가 버려진다.
      // 로그인은 성공하는데 재발급만 조용히 실패한다 (apiSpec §1.2).
      credentials: 'include',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    // 상태 코드 0 은 "응답 자체가 없었다"는 뜻으로 쓴다.
    throw new HttpError({
      status: 0,
      message: '네트워크에 연결할 수 없습니다',
    });
  }

  if (!response.ok) {
    throw await toHttpError(response);
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

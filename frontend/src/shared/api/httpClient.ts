import { type z } from 'zod';

import {
  API_BASE_PATH,
  IDEMPOTENCY_KEY_HEADER,
} from '@/shared/config/apiContract';
import { API_BASE_URL } from '@/shared/config/env';
import { parseErrorResponse } from '@/shared/types/error';
import { AUTH_ERROR_CODES } from '@/shared/types/errorCodes';
import type { IdempotencyKey } from '@/shared/types/primitives';

import { getAuthBridge } from './authBridge';
import { HttpError, SchemaError, parseRetryAfterMs } from './errors';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /**
   * 기본 true. false 면 토큰도 붙이지 않고 만료 재발급도 걸지 않는다.
   * 재발급 요청 자신이 꺼야 한다 — 켜 두면 401 을 받았을 때 다시 재발급을
   * 부르는 무한 루프가 된다 (컨벤션 §5).
   */
  shouldAttachSession?: boolean;
  /**
   * 멱등성 키 (apiSpec §1.4). 충전·주문만 쓴다.
   *
   * **범용 `headers` 맵 대신 이름 붙인 옵션인 이유** — 맵을 열면 호출부가 `Authorization` 을
   * 덮어쓸 수 있고, 그러면 세션 관리가 이 파일 한 곳이라는 전제가 깨진다. 계약이 요구하는
   * 헤더는 이것 하나뿐이므로 그것만 연다.
   *
   * **키는 호출부가 만들어 넘긴다.** 여기서 만들면 같은 클릭의 재시도마다 새 키가 되어
   * 멱등성이 무의미해진다 — 재시도가 곧 중복 충전이다.
   */
  idempotencyKey?: IdempotencyKey;
};

/** 응답 본문을 검증할 Zod 스키마. 검증을 통과한 값만 밖으로 나간다. */
type SchemaRequestOptions<TSchema extends z.ZodType<unknown>> =
  RequestOptions & { schema: TSchema };

type SentRequest = {
  response: Response;
  /** 이 요청에 실제로 실린 토큰. 안 실었으면 null. */
  sentAccessToken: string | null;
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
 * 우리 에러 형식이 아니면 code 없이 기본 문구로 떨어지고, 그 응답은 세션
 * 화이트리스트에 매칭되지 않아 안전하게 지나간다.
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

/** 토큰은 보낼 때마다 새로 읽는다. 캡처해 두면 재발급 뒤 재시도에 옛 토큰이 실린다. */
async function sendRequest(
  path: string,
  options: RequestOptions,
): Promise<SentRequest> {
  const {
    method = 'GET',
    body,
    signal,
    shouldAttachSession = true,
    idempotencyKey,
  } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (idempotencyKey !== undefined) {
    headers[IDEMPOTENCY_KEY_HEADER] = idempotencyKey;
  }

  let sentAccessToken: string | null = null;
  if (shouldAttachSession) {
    sentAccessToken = getAuthBridge()?.getAccessToken() ?? null;
    if (sentAccessToken !== null) {
      headers.Authorization = `Bearer ${sentAccessToken}`;
    }
  }

  try {
    const response = await fetch(buildUrl(path), {
      method,
      signal,
      // 기본값 same-origin 이면 교차 출처에서 Refresh 쿠키의 Set-Cookie 가 버려진다.
      // 로그인은 성공하는데 재발급만 조용히 실패한다 (apiSpec §1.2).
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { response, sentAccessToken };
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
}

/**
 * 세션을 되살렸으면 true. 호출부가 원요청을 한 번 재시도한다 (컨벤션 §5).
 *
 * 만료는 되살릴 수 있고 무효는 없다. 서버가 코드를 둘로 나눠 준 이유가 이 분기다.
 * 화이트리스트 밖의 코드는 세션을 건드리지 않고 지나간다.
 */
async function recoverSession(
  error: HttpError,
  options: RequestOptions,
  sentAccessToken: string | null,
): Promise<boolean> {
  if (options.shouldAttachSession === false) {
    return false;
  }

  const bridge = getAuthBridge();
  if (bridge === null) {
    return false;
  }

  /**
   * 토큰 없이 나간 요청의 401 은 우리 세션에 대한 판정이 아니다. 부팅 복구가 끝나기
   * 전에 출발한 요청이 여기 해당하는데, 그것으로 세션을 비우면 방금 복구된 세션까지
   * 지운다. 보낸 토큰이 이미 갱신됐다면 그 실패도 낡은 것이라 마찬가지다.
   */
  if (sentAccessToken === null || bridge.getAccessToken() !== sentAccessToken) {
    return false;
  }

  if (error.code === AUTH_ERROR_CODES.INVALID_TOKEN) {
    bridge.onSessionExpired();
    return false;
  }

  if (error.code !== AUTH_ERROR_CODES.TOKEN_EXPIRED) {
    return false;
  }

  const accessToken = await bridge.refreshSession();
  if (accessToken === null) {
    bridge.onSessionExpired();
    return false;
  }

  return true;
}

async function parseSuccess<TSchema extends z.ZodType<unknown>>(
  response: Response,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
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

/**
 * 요청을 보내고, 세션 만료면 재발급한 뒤 한 번만 다시 보낸다. 본문은 건드리지 않는다.
 *
 * 재시도가 한 번뿐인 이유 — 재발급 직후 또 거절되면 되살릴 수 없는 세션이고,
 * 더 돌면 로그인 화면에 도달하지 못한 채 왕복만 계속한다.
 */
async function sendWithSession(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const { response, sentAccessToken } = await sendRequest(path, options);
  if (response.ok) {
    return response;
  }

  const error = await toHttpError(response);
  const isRecovered = await recoverSession(error, options, sentAccessToken);
  if (!isRecovered) {
    throw error;
  }

  const retried = await sendRequest(path, options);
  if (retried.response.ok) {
    return retried.response;
  }

  const retriedError = await toHttpError(retried.response);
  if (
    retriedError.code === AUTH_ERROR_CODES.INVALID_TOKEN ||
    retriedError.code === AUTH_ERROR_CODES.TOKEN_EXPIRED
  ) {
    getAuthBridge()?.onSessionExpired();
  }
  throw retriedError;
}

/**
 * 단일 HTTP 클라이언트 (컨벤션 §5). 컴포넌트는 fetch 를 직접 부르지 않는다.
 * 응답은 Zod 로 검증한 뒤에만 반환하고, 실패는 HttpError / SchemaError 로 던진다.
 */
export async function request<TSchema extends z.ZodType<unknown>>(
  path: string,
  options: SchemaRequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const response = await sendWithSession(path, options);
  return parseSuccess(response, options.schema);
}

/**
 * 본문 없는 응답(204)을 기대하는 요청.
 * request 로 보내면 response.json() 에서 SchemaError 가 나 요청은 성공했는데
 * 실패로 보인다. 로그아웃이라면 서버 세션은 끊겼는데 화면은 로그인 상태로 남는다.
 */
export async function requestNoContent(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  await sendWithSession(path, options);
}

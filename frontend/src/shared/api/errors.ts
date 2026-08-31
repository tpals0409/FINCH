import { type ErrorDetail } from '@/shared/types/error';

type HttpErrorInit = {
  status: number;
  message: string;
  /** 429 응답의 Retry-After 를 밀리초로 환산한 값. 헤더가 없으면 null */
  retryAfterMs?: number | null;
  /** 본문이 `{code, message, detail}` 형식이 아니면 null */
  code?: string | null;
  detail?: ErrorDetail | null;
};

/**
 * 네트워크·HTTP 실패. 상태 코드는 이 타입 안에 가두고
 * 이 층 밖으로 숫자를 그대로 흘리지 않는다 (컨벤션 §5).
 *
 * 분기는 status 가 아니라 code 로 한다. 401 을 내는 주체가 우리 하나가 아니라서
 * 숫자로 나누면 AI 서버의 UNAUTHORIZED 까지 세션 만료로 오인한다.
 * status 는 재시도 정책에만 쓴다.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly retryAfterMs: number | null;
  readonly code: string | null;
  readonly detail: ErrorDetail | null;

  constructor(init: HttpErrorInit) {
    super(init.message);
    this.name = 'HttpError';
    this.status = init.status;
    this.retryAfterMs = init.retryAfterMs ?? null;
    this.code = init.code ?? null;
    this.detail = init.detail ?? null;
  }
}

/**
 * 응답 스키마 검증 실패. 네트워크 실패와 구분한다 (컨벤션 §5).
 * 이쪽은 재시도해도 결과가 같다. 서버와 명세가 어긋난 것이다.
 */
export class SchemaError extends Error {
  readonly issues: unknown;

  constructor(message: string, issues: unknown) {
    super(message);
    this.name = 'SchemaError';
    this.issues = issues;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function isSchemaError(error: unknown): error is SchemaError {
  return error instanceof SchemaError;
}

/**
 * Retry-After 는 초 단위 정수("120")와 HTTP-date 두 형식이 모두 온다.
 * 둘 다 파싱하지 못하면 null 을 돌려주고 호출부가 지수 백오프로 넘어간다.
 */
export function parseRetryAfterMs(
  headerValue: string | null,
  nowMs: number = Date.now(),
): number | null {
  if (headerValue === null) {
    return null;
  }

  const trimmed = headerValue.trim();
  if (trimmed === '') {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) {
    return null;
  }

  return Math.max(0, dateMs - nowMs);
}

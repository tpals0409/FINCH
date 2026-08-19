/**
 * 네트워크·HTTP 실패. 상태 코드는 이 타입 안에 가두고
 * 이 층 밖으로 숫자를 그대로 흘리지 않는다 (컨벤션 §5).
 */
export class HttpError extends Error {
  readonly status: number;
  /** 429 응답의 Retry-After 를 밀리초로 환산한 값. 헤더가 없으면 null */
  readonly retryAfterMs: number | null;

  constructor(status: number, message: string, retryAfterMs: number | null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
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
 * Retry-After 는 두 형식이 모두 올 수 있다.
 * - 초 단위 정수: "120"
 * - HTTP-date: "Wed, 21 Oct 2026 07:28:00 GMT"
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

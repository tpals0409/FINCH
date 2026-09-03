/**
 * 에러 `code` 문자열 상수.
 *
 * 출처: `docs/api/apiSpec.md` §11 에러 코드 목록 (인증 · 공통 · AI 중계 · 충전 ·
 * 종목·관심 종목 · 주문) · AI 명세 `ai/docs/api-spec.md` §2.6 에러 표 ·
 * `frontend/docs/contracts.md` C9 성공·실패 판단.
 *
 * **분기는 `code` 문자열로만 한다.** HTTP 상태 숫자나 `message` 문구로 실패 종류를
 * 가르지 않는다 (apiSpec §1.3 성공/실패 판단 규칙). 배포된 `code` 는 변경되지 않는다.
 *
 * 코드 문자열을 화면마다 리터럴로 적으면 오타가 조용히 통과한다. 여기 모아 두고
 * 이 상수로만 비교한다.
 *
 * **엔드포인트별 전체 목록은 아직 없다** (contracts P6, GitLab 이슈 #4).
 * 아래 목록은 §11 의 도메인별 목록이고, 여기 없는 코드가 올 수 있다.
 * 그래서 `ErrorResponseSchema.code` 는 이 union 이 아니라 `string` 이다.
 */

/** 인증 (apiSpec §11 인증). */
export const AUTH_ERROR_CODES = {
  KAKAO_FAILED: 'AUTH_KAKAO_FAILED',
  REFRESH_TOKEN_MISSING: 'AUTH_REFRESH_TOKEN_MISSING',
  INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  FORBIDDEN: 'AUTH_FORBIDDEN',
} as const;
export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

/**
 * 공통 (apiSpec §11 공통). 405·415 는 v0.3 에서 추가됐다.
 * `ROUND_READ_ONLY` 는 투자 회차와 함께 v0.7 에서 삭제됐다 (이슈 #27).
 */
export const COMMON_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  IDEMPOTENCY_KEY_REQUIRED: 'IDEMPOTENCY_KEY_REQUIRED',
  IDEMPOTENCY_IN_PROGRESS: 'IDEMPOTENCY_IN_PROGRESS',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type CommonErrorCode =
  (typeof COMMON_ERROR_CODES)[keyof typeof COMMON_ERROR_CODES];

/**
 * AI 중계 — 백엔드 발행분 (apiSpec §11 AI 중계 · §10.4 에러 통과 규칙 · contracts C11).
 * 백엔드가 AI 서버에 **도달하지 못한** 경우만 이 둘이 나온다.
 * 화면은 이 코드에서 AI 위젯만 접고 시세·주문은 살려 둔다.
 */
export const AI_RELAY_ERROR_CODES = {
  UPSTREAM_UNAVAILABLE: 'AI_UPSTREAM_UNAVAILABLE',
  UPSTREAM_TIMEOUT: 'AI_UPSTREAM_TIMEOUT',
} as const;
export type AiRelayErrorCode =
  (typeof AI_RELAY_ERROR_CODES)[keyof typeof AI_RELAY_ERROR_CODES];

/**
 * AI 서버 발행분 (AI 명세 §2.6 에러 표).
 * 백엔드가 `code`·`message`·`detail` 과 HTTP 상태를 **그대로 통과**시킨다 (apiSpec §10.4).
 *
 * `INSUFFICIENT_DATA` 는 에러가 아니라 정상적인 거절이다 (contracts C12) —
 * AI 영역만 대체 문구로 접고 화면 전체를 실패로 만들지 않는다. 사유는 `detail.reason` 으로
 * 분기하고 그 값은 `llm_key_missing`·`ledger_unavailable` **둘이 전부다** (contracts C63).
 * 다만 **모든 `INSUFFICIENT_DATA` 가 `reason` 을 갖지는 않는다** — 보유 종목·거래일·종가 없음은
 * `message` 만 있고 `detail` 이 빈 객체다. `reason` 없는 갈래를 기본 경로로 둔다.
 *
 * `RATE_LIMITED` 는 정의만 있고 세는 곳이 없어 현재 나가지 않는다 (contracts C13 주석).
 */
export const AI_SERVICE_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNSUPPORTED_MARKET: 'UNSUPPORTED_MARKET',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INSTRUMENT_NOT_FOUND: 'INSTRUMENT_NOT_FOUND',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  GUARDRAIL_BLOCKED: 'GUARDRAIL_BLOCKED',
  RATE_LIMITED: 'RATE_LIMITED',
  RETRIEVAL_FAILED: 'RETRIEVAL_FAILED',
  LLM_TIMEOUT: 'LLM_TIMEOUT',
} as const;
export type AiServiceErrorCode =
  (typeof AI_SERVICE_ERROR_CODES)[keyof typeof AI_SERVICE_ERROR_CODES];

/** 충전 (apiSpec §11 충전 · §4.2). 접두사는 `DEPOSIT_` 다 (contracts C49). */
export const DEPOSIT_ERROR_CODES = {
  AMOUNT_INVALID: 'DEPOSIT_AMOUNT_INVALID',
  PER_REQUEST_LIMIT_EXCEEDED: 'DEPOSIT_PER_REQUEST_LIMIT_EXCEEDED',
  LIMIT_EXCEEDED: 'DEPOSIT_LIMIT_EXCEEDED',
} as const;
export type DepositErrorCode =
  (typeof DEPOSIT_ERROR_CODES)[keyof typeof DEPOSIT_ERROR_CODES];

/** 종목 · 관심 종목 (apiSpec §11 종목 · 관심 종목). */
export const STOCK_ERROR_CODES = {
  STOCK_NOT_FOUND: 'STOCK_NOT_FOUND',
  WATCHLIST_LIMIT_EXCEEDED: 'WATCHLIST_LIMIT_EXCEEDED',
  WATCHLIST_ALREADY_EXISTS: 'WATCHLIST_ALREADY_EXISTS',
} as const;
export type StockErrorCode =
  (typeof STOCK_ERROR_CODES)[keyof typeof STOCK_ERROR_CODES];

/**
 * 주문 (apiSpec §11 주문 · §7.2 체결 처리 순서).
 * `GET /orders/available` 의 `reason` 에도 이 코드가 담긴다 (apiSpec §7.3).
 */
export const ORDER_ERROR_CODES = {
  QUANTITY_INVALID: 'ORDER_QUANTITY_INVALID',
  MARKET_CLOSED: 'ORDER_MARKET_CLOSED',
  STOCK_SUSPENDED: 'ORDER_STOCK_SUSPENDED',
  PRICE_CHANGED: 'ORDER_PRICE_CHANGED',
  INSUFFICIENT_CASH: 'ORDER_INSUFFICIENT_CASH',
  INSUFFICIENT_QUANTITY: 'ORDER_INSUFFICIENT_QUANTITY',
  PRICE_UNAVAILABLE: 'ORDER_PRICE_UNAVAILABLE',
} as const;
export type OrderErrorCode =
  (typeof ORDER_ERROR_CODES)[keyof typeof ORDER_ERROR_CODES];

/**
 * 인증 인터셉터가 세션에 손대는 코드 화이트리스트
 * (`frontend/docs/frontConvention.md` §5 인증 인터셉터 · contracts C23·C24).
 *
 * **HTTP 상태 숫자로 판단하지 않는다.** 401 을 내는 주체가 우리 서비스 하나가 아니다 —
 * 백엔드와 AI 서버 사이의 내부 인증이 어긋나면 AI 서버도 `UNAUTHORIZED`(401)를 내고
 * 그 상태가 그대로 프론트까지 통과한다(apiSpec §10.4). 숫자로 분기하면 AI 탭을 눌렀을 뿐인
 * 사용자를 로그아웃시킨다.
 *
 * **이 셋 밖의 모든 코드는 세션을 건드리지 않고 호출한 쪽에 그대로 넘긴다.**
 * `code` 가 없는 응답(프록시가 내는 HTML 401 등)도 매칭이 실패해 같은 경로로 지나간다.
 *
 * - `AUTH_TOKEN_EXPIRED` — 재발급 후 원요청 1회 재시도
 * - `AUTH_INVALID_TOKEN` — 재시도 없이 로그인 화면
 * - `AUTH_REFRESH_TOKEN_MISSING` — 조용히 비로그인 처리. 로그인 화면으로 보내지 않는다
 *
 * 인터셉터 구현은 이 파일의 몫이 아니다. 여기서는 화이트리스트만 정의한다.
 */
export const SESSION_ERROR_CODES = [
  AUTH_ERROR_CODES.TOKEN_EXPIRED,
  AUTH_ERROR_CODES.INVALID_TOKEN,
  AUTH_ERROR_CODES.REFRESH_TOKEN_MISSING,
] as const;
export type SessionErrorCode = (typeof SESSION_ERROR_CODES)[number];

/** 세션에 손대야 하는 코드인지 판정한다. 화이트리스트 밖은 전부 `false` 다. */
export function isSessionErrorCode(
  code: string | null | undefined,
): code is SessionErrorCode {
  if (code === null || code === undefined) {
    return false;
  }
  return (SESSION_ERROR_CODES as readonly string[]).includes(code);
}

/** 문서에 목록으로 올라온 코드 전체. 목 서버가 코드 오타를 잡을 때 쓴다. */
export const KNOWN_ERROR_CODES = [
  ...Object.values(AUTH_ERROR_CODES),
  ...Object.values(COMMON_ERROR_CODES),
  ...Object.values(AI_RELAY_ERROR_CODES),
  ...Object.values(AI_SERVICE_ERROR_CODES),
  ...Object.values(DEPOSIT_ERROR_CODES),
  ...Object.values(STOCK_ERROR_CODES),
  ...Object.values(ORDER_ERROR_CODES),
] as const;

/**
 * 문서에 올라온 코드인지 확인한다.
 * **런타임 분기에 쓰지 마라.** 엔드포인트별 전체 목록이 아직 없어(contracts P6)
 * 모르는 코드가 정상적으로 올 수 있다. 목 데이터 검증용이다.
 */
export function isKnownErrorCode(code: string): boolean {
  return (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

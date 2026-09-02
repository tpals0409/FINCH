import { type HttpResponse, type JsonBodyType } from 'msw';

import { AUTH_ERROR_CODES } from '@/shared/types/errorCodes';

import { errorResponse } from './http';

/**
 * 목 세션. `handlers.ts` 에 있던 것을 이름·동작 그대로 옮겼다.
 *
 * **상태 유지 범위** — Refresh Token 만 쿠키에 남아 새로고침을 견딘다.
 * 부팅 복구(`POST /auth/refresh`) 경로를 확인하려면 새로고침 뒤에도 남아야 하기 때문이다.
 * 그 밖의 목 상태는 전부 모듈 변수라 새로고침하면 초기값으로 돌아간다.
 */

/**
 * 목 Refresh Token.
 *
 * 실제와 다른 점 하나 — 서비스 워커 응답이라 Set-Cookie 로 HttpOnly 쿠키를 심을 수
 * 없어 핸들러가 document.cookie 로 직접 쓴다. 즉 이 쿠키는 JS 가 읽을 수 있다.
 * 새로고침을 견뎌야 부팅 복구를 확인할 수 있어서 모듈 변수 대신 쿠키를 쓴다.
 * 프론트 코드는 이 값을 읽지 않는다. 읽으면 실제 백엔드에서 깨진다.
 */
const MOCK_REFRESH_COOKIE = 'mockRefreshToken';

export const ACCESS_TOKEN_FRESH = 'mock.access.token.fresh';
/** 보호 엔드포인트가 AUTH_TOKEN_EXPIRED 로 거절하는 토큰. */
export const ACCESS_TOKEN_EXPIRED = 'mock.access.token.expired';

export function readMockRefreshToken(): string | null {
  const prefix = `${MOCK_REFRESH_COOKIE}=`;
  const entry = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return entry === undefined ? null : entry.slice(prefix.length);
}

/**
 * 회전 방식을 흉내 낸다 — 발급할 때마다 값이 바뀐다.
 * randomUUID 는 보안 컨텍스트 전용이라 폰에서 LAN 주소로 열면 없다.
 */
export function rotateMockRefreshToken(): void {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const value = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  document.cookie = `${MOCK_REFRESH_COOKIE}=${value}; path=/; max-age=1209600`;
}

export function clearMockRefreshToken(): void {
  document.cookie = `${MOCK_REFRESH_COOKIE}=; path=/; max-age=0`;
}

export function readBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (header === null || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length);
}

/**
 * 인증 필요 엔드포인트의 공통 검사 (apiSpec §11.1).
 * 통과하면 `null`, 막히면 그대로 돌려보낼 응답을 준다.
 *
 * 헤더 누락·형식 오류는 `AUTH_INVALID_TOKEN`, 만료 토큰은 `AUTH_TOKEN_EXPIRED` 다.
 * `ACCESS_TOKEN_EXPIRED` 로 로그인하면(카카오 인가 코드 `expire...`) 재발급 경로를
 * 화면에서 확인할 수 있다.
 */
export function requireAuth(
  request: Request,
): HttpResponse<JsonBodyType> | null {
  const accessToken = readBearerToken(request);

  if (accessToken === null) {
    return errorResponse(
      AUTH_ERROR_CODES.INVALID_TOKEN,
      '로그인이 필요합니다',
      401,
    );
  }

  if (accessToken === ACCESS_TOKEN_EXPIRED) {
    return errorResponse(
      AUTH_ERROR_CODES.TOKEN_EXPIRED,
      '로그인이 만료되었습니다',
      401,
    );
  }

  return null;
}

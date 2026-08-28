import { http, HttpResponse } from 'msw';

import { API_BASE_PATH, API_PATHS } from '@/shared/config/apiContract';
import {
  AUTH_ERROR_CODES,
  COMMON_ERROR_CODES,
} from '@/shared/types/errorCodes';

/**
 * MSW 핸들러. 이 디렉토리의 코드는 프로덕션 번들에 들어가면 안 되므로
 * app 진입점의 개발 전용 동적 import 로만 불러온다 (컨벤션 §2).
 */

/** `*` 로 시작해 오리진 설정이 절대 주소든 상대 주소든 같은 핸들러가 잡히게 한다. */
function mockPath(path: string): string {
  return `*${API_BASE_PATH}${path}`;
}

/**
 * 목 Refresh Token.
 *
 * 실제와 다른 점 하나 — 서비스 워커 응답이라 Set-Cookie 로 HttpOnly 쿠키를 심을 수
 * 없어 핸들러가 document.cookie 로 직접 쓴다. 즉 이 쿠키는 JS 가 읽을 수 있다.
 * 새로고침을 견뎌야 부팅 복구를 확인할 수 있어서 모듈 변수 대신 쿠키를 쓴다.
 * 프론트 코드는 이 값을 읽지 않는다. 읽으면 실제 백엔드에서 깨진다.
 */
const MOCK_REFRESH_COOKIE = 'mockRefreshToken';

const ACCESS_TOKEN_FRESH = 'mock.access.token.fresh';
/** 보호 엔드포인트가 AUTH_TOKEN_EXPIRED 로 거절하는 토큰. */
const ACCESS_TOKEN_EXPIRED = 'mock.access.token.expired';

/**
 * 인가 코드 접두사로 응답을 고른다. 백엔드 없이 네 갈래를 다 확인할 수 있다.
 * fail(인증 실패) · expire(만료 토큰 발급) · new(최초 로그인) · 그 밖(기존 회원)
 */
const KAKAO_FAIL_CODE_PREFIX = 'fail';
const KAKAO_EXPIRED_CODE_PREFIX = 'expire';
const KAKAO_NEW_USER_CODE_PREFIX = 'new';

function readMockRefreshToken(): string | null {
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
function rotateMockRefreshToken(): void {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const value = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  document.cookie = `${MOCK_REFRESH_COOKIE}=${value}; path=/; max-age=1209600`;
}

function clearMockRefreshToken(): void {
  document.cookie = `${MOCK_REFRESH_COOKIE}=; path=/; max-age=0`;
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (header === null || !header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length);
}

const authHandlers = [
  http.post(mockPath(API_PATHS.auth.kakao), async ({ request }) => {
    const body = (await request.json()) as { authorizationCode?: unknown };
    const authorizationCode = body.authorizationCode;

    if (typeof authorizationCode !== 'string' || authorizationCode === '') {
      return HttpResponse.json(
        {
          code: COMMON_ERROR_CODES.INVALID_REQUEST,
          message: '요청 값이 올바르지 않습니다',
          detail: { authorizationCode: '필수입니다' },
        },
        { status: 400 },
      );
    }

    if (authorizationCode.startsWith(KAKAO_FAIL_CODE_PREFIX)) {
      return HttpResponse.json(
        {
          code: AUTH_ERROR_CODES.KAKAO_FAILED,
          message: '카카오 인증에 실패했습니다',
        },
        { status: 401 },
      );
    }

    const isNewUser = authorizationCode.startsWith(KAKAO_NEW_USER_CODE_PREFIX);
    const accessToken = authorizationCode.startsWith(KAKAO_EXPIRED_CODE_PREFIX)
      ? ACCESS_TOKEN_EXPIRED
      : ACCESS_TOKEN_FRESH;

    rotateMockRefreshToken();

    return HttpResponse.json({
      accessToken,
      isNewUser,
      user: {
        userId: isNewUser ? 2 : 1,
        nickname: isNewUser ? '새로운핀치' : '홍길동',
        profileImageUrl: 'https://placehold.co/96x96',
      },
    });
  }),

  http.post(mockPath(API_PATHS.auth.refresh), () => {
    // 쿠키가 없는 것과 무효한 것을 나눈다. 최초 방문자는 반드시 이 경로다 (apiSpec §2.2).
    if (readMockRefreshToken() === null) {
      return HttpResponse.json(
        {
          code: AUTH_ERROR_CODES.REFRESH_TOKEN_MISSING,
          message: '로그인이 필요합니다',
        },
        { status: 401 },
      );
    }

    rotateMockRefreshToken();

    return HttpResponse.json({ accessToken: ACCESS_TOKEN_FRESH });
  }),

  http.post(mockPath(API_PATHS.auth.logout), () => {
    clearMockRefreshToken();
    return new HttpResponse(null, { status: 204 });
  }),
];

const userHandlers = [
  http.get(mockPath(API_PATHS.users.me), ({ request }) => {
    const accessToken = readBearerToken(request);

    if (accessToken === null) {
      return HttpResponse.json(
        {
          code: AUTH_ERROR_CODES.INVALID_TOKEN,
          message: '로그인이 필요합니다',
        },
        { status: 401 },
      );
    }

    if (accessToken === ACCESS_TOKEN_EXPIRED) {
      return HttpResponse.json(
        {
          code: AUTH_ERROR_CODES.TOKEN_EXPIRED,
          message: '로그인이 만료되었습니다',
        },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      userId: 1,
      nickname: '홍길동',
      profileImageUrl: 'https://placehold.co/96x96',
      currentRoundId: 3,
      joinedAt: '2026-08-25T10:00:00+09:00',
    });
  }),
];

const healthHandlers = [
  http.get('*/health', () =>
    HttpResponse.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      sampleIndexValue: 2734,
      sampleChangeRatio: 0.0123,
    }),
  ),
];

export const handlers = [...authHandlers, ...userHandlers, ...healthHandlers];

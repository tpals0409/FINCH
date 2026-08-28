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
 * 인가 코드 접두사로 응답을 고른다. 백엔드 없이 세 갈래를 다 확인할 수 있다.
 * fail(인증 실패) · new(최초 로그인) · 그 밖(기존 회원)
 */
const KAKAO_FAIL_CODE_PREFIX = 'fail';
const KAKAO_NEW_USER_CODE_PREFIX = 'new';

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

    // Set-Cookie 는 흉내만 낸다. 서비스 워커 응답이라 실제 HttpOnly 쿠키가 저장되지
    // 않으므로 재발급은 목으로 끝까지 확인할 수 없다.
    return HttpResponse.json(
      {
        accessToken: `mock.access.token.${isNewUser ? 'new' : 'existing'}`,
        isNewUser,
        user: {
          userId: isNewUser ? 2 : 1,
          nickname: isNewUser ? '새로운핀치' : '홍길동',
          profileImageUrl: 'https://placehold.co/96x96',
        },
      },
      {
        status: 200,
        headers: {
          'Set-Cookie':
            'refreshToken=mock-refresh-token; HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=1209600',
        },
      },
    );
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

export const handlers = [...authHandlers, ...healthHandlers];

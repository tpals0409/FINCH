import { KAKAO_REDIRECT_URI, KAKAO_REST_API_KEY } from '@/shared/config/env';

/**
 * 카카오 인가 화면 주소. 토큰을 받는 `kauth.kakao.com/oauth/token` 은 백엔드만 부른다
 * (Client Secret 이 필요하다).
 */
const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';

/**
 * 카카오 인가 화면으로 보낼 URL 을 만든다.
 *
 * `response_type=code` 가 Authorization Code Grant 를 고르는 자리다. 토큰을 URL 조각으로
 * 바로 받는 방식(implicit)은 토큰이 주소창·브라우저 기록·Referer 에 남아서 폐기됐다.
 * 코드를 먼저 받고 서버가 뒤에서 토큰으로 바꾸면 토큰이 브라우저 주소를 거치지 않는다.
 */
export function buildKakaoAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: 'code',
    state,
  });

  return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`;
}

import { KAKAO_REDIRECT_URI, KAKAO_REST_API_KEY } from '@/shared/config/env';

/** 토큰 교환(`/oauth/token`)은 Client Secret 이 필요해 백엔드만 부른다. */
const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';

/**
 * `response_type=code` 가 Authorization Code Grant 를 고르는 자리다.
 * 토큰을 URL 조각으로 바로 받는 implicit 방식은 토큰이 주소창·브라우저 기록·
 * Referer 에 남아서 폐기됐다.
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

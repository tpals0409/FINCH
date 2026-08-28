import { requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

/**
 * 로그아웃 (apiSpec §2.3). 응답은 204 다.
 *
 * 서버가 저장된 Refresh Token 을 버리는 것이 이 요청의 전부다. 이 호출 없이
 * 프론트에서 토큰만 지우면 쿠키가 남아 다음 부팅 복구가 그대로 다시 로그인시킨다.
 */
export function postLogout(signal?: AbortSignal): Promise<void> {
  return requestNoContent(API_PATHS.auth.logout, { method: 'POST', signal });
}

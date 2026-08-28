import { requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

/**
 * 로그아웃 (apiSpec §2.3). 응답은 `204 No Content` 다.
 *
 * 서버가 무엇을 지우는지가 이 요청의 전부다 — 서버에 저장된 Refresh Token 을 버린다.
 * **이 호출 없이 프론트에서 토큰만 지우면 로그아웃이 아니다.** 메모리의 Access Token 은
 * 사라지지만 Refresh 쿠키는 브라우저에 남아 있어서, 다음 부팅 복구가 그대로 다시
 * 로그인시킨다. 서버 쪽을 끊어야 그 쿠키가 무효가 된다.
 */
export function postLogout(signal?: AbortSignal): Promise<void> {
  return requestNoContent(API_PATHS.auth.logout, { method: 'POST', signal });
}

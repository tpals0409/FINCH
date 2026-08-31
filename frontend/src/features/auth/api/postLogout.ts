import { requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

/** 로그아웃 (apiSpec §2.3). 서버가 저장된 Refresh Token 을 버린다. 응답은 204 다. */
export function postLogout(signal?: AbortSignal): Promise<void> {
  return requestNoContent(API_PATHS.auth.logout, { method: 'POST', signal });
}

import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  TokenRefreshResponseSchema,
  type TokenRefreshResponse,
} from '@/shared/types/auth';

/**
 * Refresh Token 으로 Access Token 을 다시 받는다 (apiSpec §2.2).
 *
 * **요청 본문이 없다.** 보낼 것이 없어서가 아니라 보낼 수가 없다 — Refresh Token 은
 * `HttpOnly` 쿠키라 JS 가 읽지 못한다. 브라우저가 쿠키를 알아서 실어 보내고
 * 서버가 그것을 읽는다. 그래서 `credentials: 'include'` 가 이 요청의 전부다.
 *
 * `shouldAttachSession: false` 인 이유 — 이 요청이 401 을 받았을 때 인터셉터가
 * 다시 재발급을 부르면 무한 루프가 된다 (컨벤션 §5).
 */
export function postTokenRefresh(
  signal?: AbortSignal,
): Promise<TokenRefreshResponse> {
  return request(API_PATHS.auth.refresh, {
    method: 'POST',
    schema: TokenRefreshResponseSchema,
    shouldAttachSession: false,
    signal,
  });
}

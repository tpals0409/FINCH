import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  TokenRefreshResponseSchema,
  type TokenRefreshResponse,
} from '@/shared/types/auth';

/**
 * Refresh Token 으로 Access Token 을 다시 받는다 (apiSpec §2.2).
 *
 * 요청 본문이 없다. Refresh Token 은 HttpOnly 쿠키라 JS 가 읽지 못하고 브라우저가
 * 알아서 실어 보낸다. shouldAttachSession 을 끄는 이유는 이 요청이 401 을 받았을 때
 * 인터셉터가 다시 재발급을 부르는 무한 루프를 막기 위해서다 (컨벤션 §5).
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

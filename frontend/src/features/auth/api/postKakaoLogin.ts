import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  KakaoLoginResponseSchema,
  type KakaoLoginRequest,
  type KakaoLoginResponse,
} from '@/shared/types/auth';

/**
 * 인가 코드를 세션으로 바꾼다 (apiSpec §2.1).
 *
 * 응답 본문에는 Access Token 만 있다. Refresh Token 은 `Set-Cookie` 로만 내려오고
 * `HttpOnly` 라 JS 가 읽을 수 없다 — 브라우저가 알아서 보관하므로 여기서 할 일이 없다.
 */
export function postKakaoLogin(
  body: KakaoLoginRequest,
  signal?: AbortSignal,
): Promise<KakaoLoginResponse> {
  return request(API_PATHS.auth.kakao, {
    method: 'POST',
    body,
    schema: KakaoLoginResponseSchema,
    signal,
  });
}

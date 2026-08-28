import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  KakaoLoginResponseSchema,
  type KakaoLoginRequest,
  type KakaoLoginResponse,
} from '@/shared/types/auth';

/**
 * 인가 코드를 세션으로 바꾼다 (apiSpec §2.1).
 * 응답 본문에는 Access Token 만 있다. Refresh Token 은 Set-Cookie 로만 오고
 * HttpOnly 라 JS 가 읽을 수 없어 여기서 다룰 것이 없다.
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

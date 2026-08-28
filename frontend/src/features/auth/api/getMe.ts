import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import { MeResponseSchema, type MeResponse } from '@/shared/types/auth';

/**
 * 내 정보 조회 (apiSpec §2.4).
 * userId 를 보내지 않는다. 식별자는 토큰에서만 나온다 — 경로나 쿼리로 받으면
 * 남의 번호를 넣어 남의 정보를 읽는 요청이 만들어진다 (contracts C25).
 */
export function getMe(signal?: AbortSignal): Promise<MeResponse> {
  return request(API_PATHS.users.me, { schema: MeResponseSchema, signal });
}

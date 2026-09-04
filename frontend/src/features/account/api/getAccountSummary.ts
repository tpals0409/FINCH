import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AccountSummaryResponseSchema,
  type AccountSummaryResponse,
} from '@/shared/types/account';

/**
 * 계좌 요약 조회 (apiSpec §3.1).
 *
 * 경로에 계좌 식별자가 없다. 계좌는 사용자당 하나이고 서버가 토큰으로 찾는다 (apiSpec §1.6) —
 * 클라이언트가 지목할 대상이 아니라서 요청에도 응답에도 그 값이 없다.
 */
export function getAccountSummary(
  signal?: AbortSignal,
): Promise<AccountSummaryResponse> {
  return request(API_PATHS.account.summary, {
    schema: AccountSummaryResponseSchema,
    signal,
  });
}

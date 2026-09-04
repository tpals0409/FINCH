import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  DepositLimitResponseSchema,
  type DepositLimitResponse,
} from '@/shared/types/deposit';

/**
 * 충전 한도 조회 (apiSpec §4.1). 누적 한도의 기준은 **계정 전체**다.
 *
 * `depositedAmount` 는 초기 지급을 포함하지 않는다 — 이 값은 `GET /transactions?type=DEPOSIT`
 * 합계와 같아야 하고 그 필터에 초기 지급이 없기 때문이다 (apiSpec §8.2).
 */
export function getDepositLimit(
  signal?: AbortSignal,
): Promise<DepositLimitResponse> {
  return request(API_PATHS.deposits.limit, {
    schema: DepositLimitResponseSchema,
    signal,
  });
}

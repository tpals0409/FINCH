import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  DepositResponseSchema,
  type DepositRequest,
  type DepositResponse,
} from '@/shared/types/deposit';
import type { IdempotencyKey } from '@/shared/types/primitives';

type Params = {
  body: DepositRequest;
  /**
   * **호출부가 만들어 넘긴다.** 여기서 만들면 같은 클릭의 재시도마다 새 키가 되어
   * 재시도가 곧 두 번째 충전이 된다 (apiSpec §1.4).
   */
  idempotencyKey: IdempotencyKey;
};

/** 충전 (apiSpec §4.2). `201 Created`. **충전 취소 API 는 없다.** */
export function postDeposit({
  body,
  idempotencyKey,
}: Params): Promise<DepositResponse> {
  return request(API_PATHS.deposits.create, {
    method: 'POST',
    body,
    idempotencyKey,
    schema: DepositResponseSchema,
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';
import {
  OrderResponseSchema,
  type OrderRequest,
  type OrderResponse,
} from '@/shared/types/order';
import type { IdempotencyKey } from '@/shared/types/primitives';

type Params = {
  body: OrderRequest;
  /**
   * **호출부가 만들어 넘긴다.** 여기서 만들면 같은 주문의 재시도마다 새 키가 되어
   * 재시도가 곧 두 번째 체결이 된다 (apiSpec §1.4). 체결은 되돌릴 수 없다.
   */
  idempotencyKey: IdempotencyKey;
};

/**
 * 시장가 주문 (apiSpec §7.1).
 *
 * **`retry` 를 끈다.** TanStack 의 자동 재시도는 같은 키의 재시도가 아니라 새 요청이고,
 * 네트워크가 끊긴 사이 서버가 이미 체결했을 수 있다. 재시도는 사용자가 버튼으로 하고
 * 그때 **같은 키**를 다시 쓴다 (`useCreateDeposit` 과 같은 이유. 여기가 더 위험하다).
 *
 * 성공하면 계좌·보유·내역·시세를 무효화한다. 하나라도 빠뜨리면 "샀는데 잔고가 그대로" 가 된다.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ body, idempotencyKey }: Params): Promise<OrderResponse> =>
      request(API_PATHS.orders.create, {
        method: 'POST',
        body,
        idempotencyKey,
        schema: OrderResponseSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.account.summary(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.all(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.stocks.all() });
    },
  });
}

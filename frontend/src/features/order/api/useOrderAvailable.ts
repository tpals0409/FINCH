import { useQuery } from '@tanstack/react-query';

import {
  getQuotePollingOptions,
  type QuotePollingOverrides,
} from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';
import type { OrderSide } from '@/shared/types/order';

import { getOrderAvailable } from './getOrderAvailable';

/**
 * 비율 버튼의 분모와 주문 버튼 활성 여부의 출처다.
 *
 * `side` 가 키에 들어간다. 매수와 매도는 `maxQuantity` 의 뜻이 달라(살 수 있는 수 / 보유 수)
 * 같은 캐시를 쓸 수 없다.
 */
export function useOrderAvailable(
  stockCode: string,
  side: OrderSide,
  polling?: QuotePollingOverrides,
) {
  return useQuery({
    queryKey: queryKeys.orders.available(stockCode, side),
    queryFn: ({ signal }) => getOrderAvailable(stockCode, side, signal),
    ...getQuotePollingOptions('order', polling),
  });
}

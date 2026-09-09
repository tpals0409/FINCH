import { useQuery } from '@tanstack/react-query';

import {
  getQuotePollingOptions,
  type QuotePollingOverrides,
} from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { getStockDetail } from './getStockDetail';

export function useStockDetail(
  stockCode: string,
  polling?: QuotePollingOverrides,
) {
  return useQuery({
    queryKey: queryKeys.stocks.detail(stockCode),
    queryFn: ({ signal }) => getStockDetail(stockCode, signal),
    ...getQuotePollingOptions('list', polling),
  });
}

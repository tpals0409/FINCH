import { useQuery } from '@tanstack/react-query';

import {
  QUOTE_POLLING_INTERVAL_MS,
  QUOTE_STALE_TIME_MS,
} from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { getStockDetail } from './getStockDetail';

export function useStockDetail(stockCode: string) {
  return useQuery({
    queryKey: queryKeys.stocks.detail(stockCode),
    queryFn: ({ signal }) => getStockDetail(stockCode, signal),
    refetchInterval: QUOTE_POLLING_INTERVAL_MS.list,
    staleTime: QUOTE_STALE_TIME_MS.list,
  });
}

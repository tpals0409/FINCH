import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getStockDetail } from './getStockDetail';

export function useStockDetail(stockCode: string) {
  return useQuery({
    queryKey: queryKeys.stocks.detail(stockCode),
    queryFn: ({ signal }) => getStockDetail(stockCode, signal),
  });
}

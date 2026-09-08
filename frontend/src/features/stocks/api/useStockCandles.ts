import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import type { CandlePeriod } from '@/shared/types/stock';

import { getStockCandles } from './getStockCandles';

const CANDLE_STALE_TIME_MS = 5 * 60_000;

export function useStockCandles(stockCode: string, period: CandlePeriod) {
  return useQuery({
    queryKey: queryKeys.stocks.candles(stockCode, period),
    queryFn: ({ signal }) => getStockCandles(stockCode, period, signal),
    staleTime: CANDLE_STALE_TIME_MS,
  });
}

import { lazy, Suspense } from 'react';

import type { Candle, CandlePeriod } from '@/shared/types/stock';
import { Skeleton } from '@/shared/ui/Skeleton';

const StockCandleChart = lazy(async () => {
  const module = await import('./StockCandleChart');
  return { default: module.StockCandleChart };
});

type Props = {
  candles: Candle[];
  period: CandlePeriod;
};

/** 차트 라이브러리는 상세 화면에서 데이터가 준비된 뒤에만 내려받는다. */
export function LazyStockCandleChart(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <StockCandleChart {...props} />
    </Suspense>
  );
}

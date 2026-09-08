import * as Tabs from '@radix-ui/react-tabs';

import { CandlePeriodSchema, type CandlePeriod } from '@/shared/types/stock';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useStockCandles } from '../api/useStockCandles';

import { LazyStockCandleChart } from './LazyStockCandleChart';

type Props = {
  stockCode: string;
  period: CandlePeriod;
  onPeriodChange: (period: CandlePeriod) => void;
};

export function StockCandleSection({
  stockCode,
  period,
  onPeriodChange,
}: Props) {
  const { data, isPending, isError, isFetching, refetch } = useStockCandles(
    stockCode,
    period,
  );

  return (
    <Card className="mt-6 min-w-0" aria-labelledby="stock-candle-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="stock-candle-title" className="text-title-3 text-fg-neutral">
          일봉 차트
        </h2>
        <span className="text-caption text-fg-neutral-subtle">일봉</span>
      </div>

      <Tabs.Root
        className="mt-4"
        value={period}
        onValueChange={(next) => {
          const parsed = CandlePeriodSchema.safeParse(next);
          if (parsed.success) {
            onPeriodChange(parsed.data);
          }
        }}
      >
        <Tabs.List
          aria-label="차트 기간"
          className="flex gap-1 rounded-md bg-bg-skeleton p-1"
        >
          {CandlePeriodSchema.options.map((option) => (
            <Tabs.Trigger
              key={option}
              value={option}
              className="min-h-[44px] flex-1 rounded-sm text-label text-fg-neutral-subtle data-[state=active]:bg-bg-layer-default data-[state=active]:text-fg-neutral"
            >
              {option}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs.Root>

      <div className="mt-4" aria-live="polite">
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <p className="text-body-2 text-fg-neutral-subtle">
              차트를 불러오지 못했습니다
            </p>
            <Button
              variant="secondary"
              className="mt-3 max-w-40"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              다시 시도
            </Button>
          </div>
        ) : data.candles.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center text-center">
            <p className="text-body-2 text-fg-neutral-subtle">
              이 기간의 일봉 데이터가 없습니다
            </p>
          </div>
        ) : (
          <LazyStockCandleChart candles={data.candles} period={period} />
        )}
      </div>
    </Card>
  );
}

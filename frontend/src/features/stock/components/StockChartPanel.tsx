import { Button } from '@/shared/ui/Button';
import { SectionCard } from '@/shared/ui/SectionCard';
import { Skeleton } from '@/shared/ui/Skeleton';
import { WidgetErrorBoundary } from '@/shared/ui/WidgetErrorBoundary';

import { useStockCandles } from '../api/useStockDetail';
import { CANDLE_PERIODS, type CandlePeriod } from '../model/stockDetail';

import { StockCandleChart } from './StockCandleChart';
import { StockDayStats } from './StockDayStats';

type StockChartPanelProps = {
  stockCode: string;
  period: CandlePeriod;
  onPeriodChange: (period: CandlePeriod) => void;
};

const PERIOD_LABEL: Record<CandlePeriod, string> = {
  '1M': '1개월',
  '3M': '3개월',
  '1Y': '1년',
};

const CHART_HEIGHT = 260;

/**
 * 차트 패널. 기간 선택 · 캔들 차트 · 오늘의 수치 넷을 한 카드에 담는다.
 *
 * 카드에 표제를 달지 않는다. 위쪽 탭이 이미 `차트` 라고 말했고, 카드 안에
 * 같은 말을 다시 쓰면 첫 화면에서 40px 을 표제가 먹는다.
 *
 * 기간 선택은 오른쪽 정렬한 작은 글자 줄이다. 위쪽 탭과 같은 크기의 분절
 * 컨트롤을 두 줄 겹치면 어느 쪽이 상위인지 읽히지 않는다. 이쪽은 13px 이고
 * 고른 칸만 승격면 알약이 되어, 형태로 한 단 아래임을 말한다.
 */
export function StockChartPanel({
  stockCode,
  period,
  onPeriodChange,
}: StockChartPanelProps) {
  const { data, isPending, isError, refetch, isFetching } = useStockCandles(
    stockCode,
    period,
  );

  return (
    <SectionCard isFlush>
      <div
        role="radiogroup"
        aria-label="차트 기간"
        className="flex justify-end gap-1 px-3 pt-2"
      >
        {CANDLE_PERIODS.map((candlePeriod) => {
          const isActive = candlePeriod === period;
          return (
            <button
              key={candlePeriod}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onPeriodChange(candlePeriod)}
              className={`min-h-11 rounded-full px-3.5 text-meta transition-colors duration-200 ${
                isActive
                  ? 'border border-border bg-elevated font-semibold text-text shadow-card'
                  : 'border border-transparent font-medium text-text-muted'
              }`}
            >
              {PERIOD_LABEL[candlePeriod]}
            </button>
          );
        })}
      </div>

      <WidgetErrorBoundary label="차트">
        {isPending ? (
          /* 스켈레톤 높이를 차트와 같은 상수로 고정한다. 다르면 데이터가
             도착할 때 카드가 늘어나며 아래 내용이 튄다. */
          <div className="px-3" style={{ height: CHART_HEIGHT }}>
            <Skeleton className="size-full rounded-xl" />
          </div>
        ) : null}

        {isError ? (
          <div className="px-5 py-10 text-center">
            <p className="text-body text-text">차트를 불러오지 못했습니다</p>
            <div className="mt-4">
              <Button onClick={() => void refetch()} isDisabled={isFetching}>
                다시 시도
              </Button>
            </div>
          </div>
        ) : null}

        {data !== undefined && data.length === 0 ? (
          /* 빈 상태는 에러가 아니다. 신규 상장이나 장기 거래정지면 봉이 없다. */
          <div className="px-5 py-10 text-center">
            <p className="text-body text-text">
              이 기간에 표시할 일봉이 없습니다
            </p>
            <p className="mt-1.5 text-note text-text-muted">
              다른 기간을 골라 보세요
            </p>
          </div>
        ) : null}

        {data !== undefined && data.length > 0 ? (
          /* 캔버스에 좌우 12px 을 준다. 0 으로 두면 첫 x축 라벨(`6월`)이 카드
             왼쪽 모서리에 반쯤 잘리고, 가격 축 라벨이 오른쪽 테두리에 붙는다. */
          <div className="px-3">
            <StockCandleChart candles={data} height={CHART_HEIGHT} />
          </div>
        ) : null}
      </WidgetErrorBoundary>

      <div className="border-t border-border px-5 pt-4 pb-4">
        <StockDayStats stockCode={stockCode} />
      </div>
    </SectionCard>
  );
}

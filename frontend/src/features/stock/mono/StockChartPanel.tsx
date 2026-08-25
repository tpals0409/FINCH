// DIRECTION: mono (S15P21A101-95)

import { Button } from '@/shared/ui/mono/Button';
import { SectionCard } from '@/shared/ui/mono/SectionCard';
import { Skeleton } from '@/shared/ui/mono/Skeleton';
import { WidgetErrorBoundary } from '@/shared/ui/mono/WidgetErrorBoundary';

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
 * 기간 선택은 오른쪽 정렬한 작은 알약 줄이다. 위쪽 탭과 같은 크기의 눌린
 * 트랙을 두 줄 겹치면 어느 쪽이 상위인지 읽히지 않는다. 이쪽은 트랙 없이
 * 고른 칸만 떠오르게 해서, 깊이 한 단으로 위계를 말한다.
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
      <div role="radiogroup" aria-label="차트 기간" className="mono-chip-row">
        {CANDLE_PERIODS.map((candlePeriod) => (
          <button
            key={candlePeriod}
            type="button"
            role="radio"
            aria-checked={candlePeriod === period}
            onClick={() => onPeriodChange(candlePeriod)}
            className="mono-chip"
          >
            {PERIOD_LABEL[candlePeriod]}
          </button>
        ))}
      </div>

      <WidgetErrorBoundary label="차트">
        {isPending ? (
          /* 스켈레톤 높이를 차트와 같은 상수로 고정한다. 다르면 데이터가
             도착할 때 카드가 늘어나며 아래 내용이 튄다. */
          <div style={{ padding: '0 0.75rem', height: CHART_HEIGHT }}>
            <Skeleton className="mono-skeleton-chart" />
          </div>
        ) : null}

        {isError ? (
          <div className="mono-center">
            <p className="mono-body mono-fg">차트를 불러오지 못했습니다</p>
            <div style={{ marginTop: '1rem' }}>
              <Button onClick={() => void refetch()} isDisabled={isFetching}>
                다시 시도
              </Button>
            </div>
          </div>
        ) : null}

        {data !== undefined && data.length === 0 ? (
          /* 빈 상태는 에러가 아니다. 신규 상장이나 장기 거래정지면 봉이 없다. */
          <div className="mono-center">
            <p className="mono-body mono-fg">
              이 기간에 표시할 일봉이 없습니다
            </p>
            <p className="mono-empty-note">다른 기간을 골라 보세요</p>
          </div>
        ) : null}

        {data !== undefined && data.length > 0 ? (
          /* 캔버스에 좌우 12px 을 준다. 0 으로 두면 첫 x축 라벨이 카드
             왼쪽 모서리에 반쯤 잘리고, 가격 축 라벨이 오른쪽 끝에 붙는다. */
          <div style={{ padding: '0 0.75rem' }}>
            <StockCandleChart candles={data} height={CHART_HEIGHT} />
          </div>
        ) : null}
      </WidgetErrorBoundary>

      <div className="mono-card-foot">
        <StockDayStats stockCode={stockCode} />
      </div>
    </SectionCard>
  );
}

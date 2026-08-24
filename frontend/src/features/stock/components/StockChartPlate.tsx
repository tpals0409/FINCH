import { WidgetErrorBoundary } from '@/shared/ui/WidgetErrorBoundary';

import { useStockCandles } from '../api/useStockDetail';
import { CANDLE_PERIODS, type CandlePeriod } from '../model/stockDetail';

import { StockCandleChart } from './StockCandleChart';

type StockChartPlateProps = {
  stockCode: string;
  period: CandlePeriod;
  onPeriodChange: (period: CandlePeriod) => void;
};

const PERIOD_LABEL: Record<CandlePeriod, string> = {
  '1M': '1개월',
  '3M': '3개월',
  '1Y': '1년',
};

/**
 * 도판 구획. 기간 선택과 캔들 차트를 담는다.
 *
 * 기간 선택은 알약 버튼이 아니라 괘선으로 칸을 나눈 줄이다. 고른 칸은 아래
 * 2px 먹선으로 표시한다. 채움색 버튼을 쓰면 지면 최하단의 주문 사각과
 * 무게를 다투게 된다 — 이 화면에서 채워진 먹 사각은 하나여야 한다.
 */
export function StockChartPlate({
  stockCode,
  period,
  onPeriodChange,
}: StockChartPlateProps) {
  const { data, isPending, isError, refetch, isFetching } = useStockCandles(
    stockCode,
    period,
  );

  return (
    <div>
      {/* 기간 선택은 색인 줄 바로 아래에 놓인다. 같은 크기의 3칸 줄을 두 개
          겹치면 어느 쪽이 상위인지 읽히지 않으므로, 이쪽은 왼쪽에 이름을 달고
          오른쪽에 작은 글자로 붙여 한 단 아래임을 형태로 말한다. */}
      <div className="flex items-center justify-between border-b border-rule-faint pr-2 pl-4">
        <span
          id="chart-period-label"
          className="font-mono text-[0.6875rem] tracking-[0.16em] text-ink-muted"
        >
          기간
        </span>
        <div role="group" aria-labelledby="chart-period-label" className="flex">
          {CANDLE_PERIODS.map((candlePeriod) => {
            const isActive = candlePeriod === period;
            return (
              <button
                key={candlePeriod}
                type="button"
                aria-pressed={isActive}
                onClick={() => onPeriodChange(candlePeriod)}
                className={`min-h-11 px-3 font-display text-[0.8125rem] tracking-[0.02em] ${
                  isActive
                    ? 'font-semibold text-ink underline decoration-2 underline-offset-[0.45em]'
                    : 'text-ink-muted'
                }`}
              >
                {PERIOD_LABEL[candlePeriod]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 도판은 판면 전폭을 쓴다. 좌우 여백을 주지 않는다. */}
      <WidgetErrorBoundary label="도판">
        {isPending ? (
          <div
            className="animate-pulse bg-rule-faint/40"
            style={{ height: 260 }}
            aria-hidden="true"
          />
        ) : null}

        {isError ? (
          <div className="px-4 py-10">
            <p className="text-[0.9375rem] text-ink">
              도판을 불러오지 못했습니다
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="mt-3 min-h-11 border border-ink px-4 font-display text-[0.8125rem] font-semibold tracking-[0.04em] text-ink disabled:opacity-50"
            >
              다시 시도
            </button>
          </div>
        ) : null}

        {data !== undefined && data.length === 0 ? (
          /* 빈 상태는 에러가 아니다. 신규 상장이나 장기 거래정지면 봉이 없다. */
          <div className="px-4 py-10">
            <p className="text-[0.9375rem] text-ink">
              이 기간에 표시할 일봉이 없습니다
            </p>
            <p className="mt-1.5 text-[0.8125rem] text-ink-muted">
              다른 기간을 골라 보세요
            </p>
          </div>
        ) : null}

        {data !== undefined && data.length > 0 ? (
          <StockCandleChart candles={data} />
        ) : null}
      </WidgetErrorBoundary>
    </div>
  );
}

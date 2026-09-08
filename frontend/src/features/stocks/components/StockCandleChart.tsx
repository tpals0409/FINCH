import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type Time,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';

import type { Candle, CandlePeriod } from '@/shared/types/stock';

const CHART_HEIGHT = 256;

function toChartData(candle: Candle): CandlestickData<Time> {
  return {
    time: candle.date,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };
}

type Props = {
  candles: Candle[];
  period: CandlePeriod;
};

export function StockCandleChart({ candles, period }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const first = candles[0];
  const last = candles.at(-1);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const styles = getComputedStyle(container);
    const color = (token: string) => styles.getPropertyValue(token).trim();
    const chart = createChart(container, {
      height: CHART_HEIGHT,
      layout: {
        background: {
          type: ColorType.Solid,
          color: color('--color-bg-layer-default'),
        },
        textColor: color('--color-fg-neutral-subtle'),
      },
      grid: {
        vertLines: { color: color('--color-stroke-neutral-subtle') },
        horzLines: { color: color('--color-stroke-neutral-subtle') },
      },
      rightPriceScale: {
        borderColor: color('--color-stroke-neutral-weak'),
      },
      timeScale: {
        borderColor: color('--color-stroke-neutral-weak'),
      },
      handleScroll: false,
      handleScale: false,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: color('--color-fg-up'),
      downColor: color('--color-fg-down'),
      borderUpColor: color('--color-fg-up'),
      borderDownColor: color('--color-fg-down'),
      wickUpColor: color('--color-fg-up'),
      wickDownColor: color('--color-fg-down'),
    });

    series.setData(candles.map(toChartData));
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (width > 0) {
        chart.applyOptions({ width: Math.floor(width) });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [candles]);

  const range =
    first === undefined || last === undefined
      ? ''
      : `${first.date}부터 ${last.date}까지`;

  return (
    <div
      ref={containerRef}
      className="h-64 w-full min-w-0"
      role="img"
      aria-label={`${period} ${range} 일봉 ${candles.length}개`}
    />
  );
}

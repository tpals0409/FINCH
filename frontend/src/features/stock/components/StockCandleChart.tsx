import {
  CandlestickSeries,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';

import type { Candle } from '../model/stockDetail';

type StockCandleChartProps = {
  candles: Candle[];
};

const CHART_HEIGHT = 260;

/** 도판 색은 CSS 토큰에서 읽는다. 차트가 캔버스라 유틸리티 클래스가 닿지 않는다. */
type ChartPalette = {
  ground: string;
  ink: string;
  inkMuted: string;
  rule: string;
  ruleFaint: string;
  rise: string;
  fall: string;
};

/**
 * 토큰 값을 실제 계산된 스타일에서 읽어 온다.
 *
 * 색을 이 파일에 다시 적으면 토큰과 차트가 갈라진다. 캔버스는 CSS 변수를
 * 이해하지 못하므로 읽어서 문자열로 넘기는 것이 토큰을 단일 진실로 유지하는
 * 유일한 방법이다. 다크로 전환되면 같은 이름의 값이 바뀌므로 다시 읽는다.
 */
function readChartPalette(): ChartPalette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;

  return {
    ground: read('--finch-ground', '#f2f1ed'),
    ink: read('--finch-ink', '#14161a'),
    inkMuted: read('--finch-ink-muted', '#5a5e66'),
    rule: read('--finch-rule', '#8d8878'),
    ruleFaint: read('--finch-rule-faint', '#bfbbae'),
    rise: read('--finch-rise', '#d6252b'),
    fall: read('--finch-fall', '#1364df'),
  };
}

/** 6자리 hex 에 알파 두 자리를 붙인다. 거래량 막대는 도판을 덮지 않게 옅게 깐다. */
function withAlpha(hexColor: string, alphaHex: string): string {
  return hexColor.length === 7 ? `${hexColor}${alphaHex}` : hexColor;
}

function toTimestamp(date: string): UTCTimestamp {
  return (Date.parse(`${date}T00:00:00Z`) / 1000) as UTCTimestamp;
}

/**
 * 도감의 도판 자리. 일봉 캔들과 거래량을 한 판에 놓는다.
 *
 * 지면 전폭을 쓰고 좌우 여백을 두지 않는다. 도판은 판면 끝까지 간다.
 * 색은 상승 적색, 하락 청색 — 지표에만 색을 쓴다는 규칙이 캔버스에서도 같다.
 *
 * 세로 터치 드래그를 끈다. 켜 두면 차트를 지나갈 때 페이지가 스크롤되지 않아
 * 모바일에서 화면 아래로 내려갈 수 없다.
 */
export function StockCandleChart({ candles }: StockCandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // 생성과 해제는 마운트당 한 번이다. 데이터가 바뀔 때마다 차트를 다시 만들면
  // 사용자가 맞춰 둔 확대·이동이 매번 초기화된다.
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    const palette = readChartPalette();
    const chart = createChart(container, {
      height: CHART_HEIGHT,
      autoSize: true,
      layout: {
        background: { color: palette.ground },
        textColor: palette.inkMuted,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: palette.ruleFaint, style: 0 },
      },
      rightPriceScale: { borderColor: palette.rule },
      timeScale: {
        borderColor: palette.rule,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: {
          color: palette.ink,
          width: 1,
          style: 2,
          labelVisible: false,
        },
        horzLine: { color: palette.ink, width: 1, style: 2 },
      },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      // 원 단위 정수다. 기본 포맷은 `78000.00` 처럼 소수 두 자리를 붙여
      // 국내 주가 표기가 아닌 값을 축에 새긴다.
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
      // 마지막 종가 축 라벨을 끈다. 기본값은 등락색으로 채운 알약 배지를 축에
      // 그리는데, 적/청을 배경에 쓰지 않는다는 규칙에 걸리고 화면 최대 물질인
      // 현재가와 같은 숫자를 두 번 말한다. 기준선만 먹색 점선으로 남긴다.
      lastValueVisible: false,
      priceLineColor: palette.ink,
      priceLineWidth: 1,
      priceLineStyle: 2,
      upColor: palette.rise,
      downColor: palette.fall,
      borderUpColor: palette.rise,
      borderDownColor: palette.fall,
      wickUpColor: palette.rise,
      wickDownColor: palette.fall,
    });
    candleSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.08, bottom: 0.28 },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // 라이트·다크는 같은 토큰의 값만 바뀐다. 전환되면 읽어서 다시 적용한다.
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSchemeChange = () => {
      const next = readChartPalette();
      chart.applyOptions({
        layout: {
          background: { color: next.ground },
          textColor: next.inkMuted,
        },
        grid: { horzLines: { color: next.ruleFaint } },
        rightPriceScale: { borderColor: next.rule },
        timeScale: { borderColor: next.rule },
        crosshair: {
          vertLine: { color: next.ink },
          horzLine: { color: next.ink },
        },
      });
      candleSeries.applyOptions({
        priceLineColor: next.ink,
        upColor: next.rise,
        downColor: next.fall,
        borderUpColor: next.rise,
        borderDownColor: next.fall,
        wickUpColor: next.rise,
        wickDownColor: next.fall,
      });
    };
    colorScheme.addEventListener('change', handleSchemeChange);

    return () => {
      colorScheme.removeEventListener('change', handleSchemeChange);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (chart === null || candleSeries === null || volumeSeries === null) {
      return;
    }

    const palette = readChartPalette();
    candleSeries.setData(
      candles.map((candle) => ({
        time: toTimestamp(candle.date),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    );
    // 거래량은 무채색 한 색으로 깐다. 등락색으로 칠하면 파스텔 두 색이
    // 도판 아래에 깔려 캔들의 적/청과 경쟁하고, 옅은 적/청은 이 제품의
    // 명시적 실패 조건인 파스텔로 읽힌다. 거래량은 방향이 아니라 양이다.
    volumeSeries.setData(
      candles.map((candle) => ({
        time: toTimestamp(candle.date),
        value: candle.volume,
        color: withAlpha(palette.inkMuted, '4d'),
      })),
    );
    chart.timeScale().fitContent();
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: CHART_HEIGHT }}
    />
  );
}

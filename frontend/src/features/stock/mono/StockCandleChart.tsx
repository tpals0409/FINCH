// DIRECTION: mono (S15P21A101-95)

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
  height: number;
};

/** 차트 색은 CSS 토큰에서 읽는다. 캔버스라 클래스가 닿지 않는다. */
type ChartPalette = {
  surface: string;
  text: string;
  textMuted: string;
  line: string;
  rise: string;
  fall: string;
};

/**
 * 토큰 값을 계산된 스타일에서 읽어 온다.
 *
 * **`document.documentElement` 가 아니라 컨테이너에서 읽는다.** `--mono-*` 는
 * `.mono-screen` 에 선언돼 있어서 루트에는 없다. 루트에서 읽으면 전부 빈
 * 문자열이 되어 폴백 값으로 떨어지고, 그러면 토큰을 고쳐도 차트만 안 바뀐다.
 *
 * 색을 이 파일에 다시 적지 않는 이유는 토큰과 차트가 갈라지는 것을 막기
 * 위해서다. 다크로 전환되면 같은 이름의 값이 바뀌므로 다시 읽는다.
 */
function readChartPalette(element: HTMLElement): ChartPalette {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;

  return {
    surface: read('--mono-surface', '#f7f5f2'),
    text: read('--mono-text', '#23211f'),
    textMuted: read('--mono-text-muted', '#65605a'),
    line: read('--mono-line', 'rgb(35 33 31 / 0.12)'),
    rise: read('--mono-rise', '#c0231f'),
    fall: read('--mono-fall', '#12429e'),
  };
}

/** 6자리 hex 에 알파 두 자리를 붙인다. 거래량 막대는 캔들을 덮지 않게 옅게 깐다. */
function withAlpha(hexColor: string, alphaHex: string): string {
  return hexColor.length === 7 ? `${hexColor}${alphaHex}` : hexColor;
}

function toTimestamp(date: string): UTCTimestamp {
  return (Date.parse(`${date}T00:00:00Z`) / 1000) as UTCTimestamp;
}

/**
 * 일봉 캔들과 거래량.
 *
 * 배경은 지면이 아니라 **떠오른 면**이다. 이 차트는 카드 안에 있고, 캔버스가
 * 자기 배경을 따로 칠하므로 카드 색과 맞추지 않으면 차트 자리에 다른 색
 * 사각이 뚫린다. 3D 카드는 특히 티가 난다 — 그림자로 떠 있는 판 한가운데에
 * 색이 다른 구멍이 생기면 카드가 두 겹으로 보인다.
 *
 * 캔들 색은 상승 적색, 하락 청색이다 — 신호색을 지표에만 쓴다는 규칙이
 * 캔버스에서도 같다.
 *
 * 세로 터치 드래그를 끈다. 켜 두면 차트를 지나갈 때 페이지가 스크롤되지 않아
 * 모바일에서 화면 아래로 내려갈 수 없다.
 */
export function StockCandleChart({ candles, height }: StockCandleChartProps) {
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

    const palette = readChartPalette(container);
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { color: palette.surface },
        textColor: palette.textMuted,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: palette.line, style: 0 },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: {
          color: palette.textMuted,
          width: 1,
          style: 2,
          labelVisible: false,
        },
        horzLine: { color: palette.textMuted, width: 1, style: 2 },
      },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      // 원 단위 정수다. 기본 포맷은 `78000.00` 처럼 소수 두 자리를 붙여
      // 국내 주가 표기가 아닌 값을 축에 새긴다.
      priceFormat: { type: 'price', precision: 0, minMove: 1 },
      // 마지막 종가 축 라벨을 끈다. 기본값은 등락색으로 채운 배지를 그리는데,
      // 신호색을 배경으로 쓰지 않는다는 규칙에 걸리고 화면 최대 활자인
      // 현재가와 같은 숫자를 두 번 말한다. 기준선만 먹색 점선으로 남긴다.
      lastValueVisible: false,
      priceLineColor: palette.text,
      priceLineWidth: 1,
      priceLineStyle: 2,
      upColor: palette.rise,
      downColor: palette.fall,
      borderUpColor: palette.rise,
      borderDownColor: palette.fall,
      wickUpColor: palette.rise,
      wickDownColor: palette.fall,
    });
    // 위 여백을 넉넉히 둔다. 좁히면 최상단 눈금선이 캔버스 맨 위에 붙어
    // 그 가격 라벨이 위쪽 절반만 남고 잘린다.
    candleSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.16, bottom: 0.28 },
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
      const next = readChartPalette(container);
      chart.applyOptions({
        layout: {
          background: { color: next.surface },
          textColor: next.textMuted,
        },
        grid: { horzLines: { color: next.line } },
        crosshair: {
          vertLine: { color: next.textMuted },
          horzLine: { color: next.textMuted },
        },
      });
      candleSeries.applyOptions({
        priceLineColor: next.text,
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
    const container = containerRef.current;
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (
      container === null ||
      chart === null ||
      candleSeries === null ||
      volumeSeries === null
    ) {
      return;
    }

    const palette = readChartPalette(container);
    candleSeries.setData(
      candles.map((candle) => ({
        time: toTimestamp(candle.date),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    );
    // 거래량은 무채색 한 색으로 깐다. 등락색으로 칠하면 옅은 적/청 두 색이
    // 차트 아래에 깔려 캔들과 경쟁하고, 옅은 적/청은 파스텔로 읽힌다.
    // 이 방향은 캐릭터가 무채색이라는 것이 전부여서 파스텔이 특히 치명적이다.
    volumeSeries.setData(
      candles.map((candle) => ({
        time: toTimestamp(candle.date),
        value: candle.volume,
        color: withAlpha(palette.textMuted, '40'),
      })),
    );
    chart.timeScale().fitContent();
  }, [candles]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}

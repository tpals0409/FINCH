import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CandleSchema } from '@/shared/types/stock';

import { StockCandleChart } from './StockCandleChart';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const chartMocks = vi.hoisted(() => {
  const setData = vi.fn();
  const fitContent = vi.fn();
  const applyOptions = vi.fn();
  const remove = vi.fn();
  const addSeries = vi.fn(() => ({ setData }));
  const createChart = vi.fn(() => ({
    addSeries,
    applyOptions,
    remove,
    timeScale: () => ({ fitContent }),
  }));

  return { setData, fitContent, applyOptions, remove, addSeries, createChart };
});

vi.mock('lightweight-charts', () => ({
  CandlestickSeries: 'CandlestickSeries',
  ColorType: { Solid: 'solid' },
  createChart: chartMocks.createChart,
}));

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];

  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverMock.instances.push(this);
  }
}

const candles = CandleSchema.array().parse([
  {
    date: '2026-09-05',
    open: 73_000,
    high: 74_000,
    low: 72_500,
    close: 73_500,
    volume: 1_000,
  },
  {
    date: '2026-09-08',
    open: 73_500,
    high: 75_000,
    low: 73_000,
    close: 74_500,
    volume: 1_500,
  },
]);

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  chartMocks.setData.mockClear();
  chartMocks.fitContent.mockClear();
  chartMocks.applyOptions.mockClear();
  chartMocks.remove.mockClear();
  chartMocks.addSeries.mockClear();
  chartMocks.createChart.mockClear();
  ResizeObserverMock.instances = [];
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    getPropertyValue: (token: string) =>
      ({
        '--color-bg-layer-default': '#ffffff',
        '--color-fg-neutral-subtle': '#555555',
        '--color-stroke-neutral-subtle': '#eeeeee',
        '--color-stroke-neutral-weak': '#dddddd',
        '--color-fg-up': '#cc0000',
        '--color-fg-down': '#0000cc',
      })[token] ?? '',
  } as CSSStyleDeclaration);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('StockCandleChart', () => {
  it('캔들을 그리고 폭 변화에 맞춰 리사이즈한 뒤 인스턴스를 정리한다', () => {
    act(() => root.render(<StockCandleChart candles={candles} period="1M" />));

    expect(chartMocks.createChart).toHaveBeenCalledOnce();
    expect(chartMocks.setData).toHaveBeenCalledWith([
      {
        time: '2026-09-05',
        open: 73_000,
        high: 74_000,
        low: 72_500,
        close: 73_500,
      },
      {
        time: '2026-09-08',
        open: 73_500,
        high: 75_000,
        low: 73_000,
        close: 74_500,
      },
    ]);
    expect(chartMocks.fitContent).toHaveBeenCalledOnce();
    expect(chartMocks.addSeries).toHaveBeenCalledWith('CandlestickSeries', {
      upColor: '#cc0000',
      downColor: '#0000cc',
      borderUpColor: '#cc0000',
      borderDownColor: '#0000cc',
      wickUpColor: '#cc0000',
      wickDownColor: '#0000cc',
    });
    expect(host.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
      '1M 2026-09-05부터 2026-09-08까지 일봉 2개',
    );

    const observer = ResizeObserverMock.instances[0];
    expect(observer).toBeDefined();
    for (const width of [390, 320]) {
      act(() => {
        observer?.callback(
          [{ contentRect: { width } } as ResizeObserverEntry],
          observer as unknown as ResizeObserver,
        );
      });
    }
    expect(chartMocks.applyOptions.mock.calls).toEqual([
      [{ width: 390 }],
      [{ width: 320 }],
    ]);

    act(() => root.unmount());
    expect(observer?.disconnect).toHaveBeenCalledOnce();
    expect(chartMocks.remove).toHaveBeenCalledOnce();
    root = createRoot(host);
  });
});

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CandlesResponseSchema,
  type CandlesResponse,
} from '@/shared/types/stock';

import { StockCandleSection } from './StockCandleSection';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const queryState = vi.hoisted(() => ({
  data: undefined as CandlesResponse | undefined,
  isPending: false,
  isError: false,
  isFetching: false,
  refetch: vi.fn(),
}));

vi.mock('../api/useStockCandles', () => ({
  useStockCandles: () => queryState,
}));

vi.mock('./StockCandleChart', () => ({
  StockCandleChart: () => <div data-testid="candle-chart" />,
}));

let host: HTMLDivElement;
let root: Root;

function renderSection(onPeriodChange = vi.fn()) {
  act(() =>
    root.render(
      <StockCandleSection
        stockCode="005930"
        period="1M"
        onPeriodChange={onPeriodChange}
      />,
    ),
  );
  return onPeriodChange;
}

beforeEach(() => {
  queryState.data = CandlesResponseSchema.parse({
    stockCode: '005930',
    period: '1M',
    interval: 'DAY',
    candles: [
      {
        date: '2026-09-08',
        open: 73_000,
        high: 74_000,
        low: 72_500,
        close: 73_500,
        volume: 1_000,
      },
    ],
  });
  queryState.isPending = false;
  queryState.isError = false;
  queryState.isFetching = false;
  queryState.refetch.mockReset();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('StockCandleSection', () => {
  it('세 기간 탭을 키보드 포커스 순서로 제공하고 선택을 전달한다', () => {
    const onPeriodChange = renderSection();
    const tabs = [...host.querySelectorAll<HTMLElement>('[role="tab"]')];

    expect(tabs.map((tab) => tab.textContent)).toEqual(['1M', '3M', '1Y']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([
      'true',
      'false',
      'false',
    ]);
    act(() => {
      tabs[0]?.focus();
    });
    expect(document.activeElement).toBe(tabs[0]);
    expect(tabs[0]?.tabIndex).toBe(0);

    act(() => {
      tabs[1]?.focus();
      tabs[1]?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(tabs[1]);
    expect(onPeriodChange).toHaveBeenCalledWith('3M');
  });

  it('로딩·빈값·오류를 서로 다른 상태로 제공한다', () => {
    queryState.isPending = true;
    queryState.data = undefined;
    renderSection();
    expect(host.querySelector('[aria-hidden="true"]')).not.toBeNull();

    queryState.isPending = false;
    queryState.data = CandlesResponseSchema.parse({
      stockCode: '005930',
      period: '1M',
      interval: 'DAY',
      candles: [],
    });
    renderSection();
    expect(host.textContent).toContain('이 기간의 일봉 데이터가 없습니다');

    queryState.data = undefined;
    queryState.isError = true;
    renderSection();
    const retry = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === '다시 시도',
    );
    expect(host.textContent).toContain('차트를 불러오지 못했습니다');
    act(() => retry?.click());
    expect(queryState.refetch).toHaveBeenCalledOnce();
  });
});

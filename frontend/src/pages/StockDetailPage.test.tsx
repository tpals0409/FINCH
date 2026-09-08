import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StockDetailPage } from './StockDetailPage';

const state = vi.hoisted(() => ({ suspended: false }));

vi.mock('@/features/stocks', () => ({
  StockDetailPrice: () => null,
  WatchToggleButton: () => null,
  useStockDetail: () => ({
    data: {
      stockCode: '005930',
      stockName: '삼성전자',
      market: 'KOSPI',
      currentPrice: 73_500,
      previousClose: 74_400,
      changeAmount: -900,
      changeRate: -1.21,
      suspended: state.suspended,
      suspendedReason: state.suspended ? '조회공시 요구' : null,
      watched: false,
      asOf: '2026-09-08T09:30:00+09:00',
      holding: null,
    },
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

function renderPage() {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/stocks/005930']}>
      <Routes>
        <Route path="/stocks/:stockCode" element={<StockDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return container;
}

describe('StockDetailPage 주문 진입점', () => {
  beforeEach(() => {
    state.suspended = false;
  });

  it('정상 종목은 주문 화면 링크를 제공한다', () => {
    const page = renderPage();

    expect(
      page.querySelector('a[href="/stocks/005930/order"]')?.textContent,
    ).toBe('매수·매도');
  });

  it('거래정지 종목은 주문 링크 없이 비활성 버튼을 제공한다', () => {
    state.suspended = true;
    const page = renderPage();
    const orderButton = [...page.querySelectorAll('button')].find(
      (button) => button.textContent === '매수·매도',
    );

    expect(page.querySelector('a[href$="/order"]')).toBeNull();
    expect(orderButton?.disabled).toBe(true);
  });
});

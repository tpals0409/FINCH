import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { StockDetailResponseSchema } from '@/shared/types/stock';

import { StockDetailPrice } from './StockDetailPrice';

const STOCK = StockDetailResponseSchema.parse({
  stockCode: '005930',
  stockName: '삼성전자',
  market: 'KOSPI',
  currentPrice: 73_500,
  previousClose: 74_400,
  changeAmount: -900,
  changeRate: -1.21,
  suspended: false,
  suspendedReason: null,
  watched: false,
  asOf: '2026-09-08T09:30:45+09:00',
  holding: null,
});

describe('StockDetailPrice', () => {
  it('서버의 시세 기준 시각을 KST 갱신 시각으로 표시한다', () => {
    const html = renderToStaticMarkup(<StockDetailPrice stock={STOCK} />);

    expect(html).toContain('09:30:45 갱신');
  });

  it('시세 기준 시각이 없으면 갱신 시각을 만들지 않는다', () => {
    const html = renderToStaticMarkup(
      <StockDetailPrice stock={{ ...STOCK, asOf: null }} />,
    );

    expect(html).not.toContain('갱신');
  });
});

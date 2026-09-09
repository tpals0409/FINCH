import { describe, expect, it } from 'vitest';

import { HoldingSchema } from '@/shared/types/portfolio';

import { sortHoldings } from './sortHoldings';

const holdings = [
  {
    stockCode: '000001',
    stockName: '한글',
    quantity: 1,
    avgBuyPrice: 100,
    currentPrice: 110,
    evaluationAmount: 110,
    evaluationProfit: 10,
    evaluationProfitRate: 10,
  },
  {
    stockCode: '000002',
    stockName: '가나다',
    quantity: 1,
    avgBuyPrice: 200,
    currentPrice: 180,
    evaluationAmount: 180,
    evaluationProfit: -20,
    evaluationProfitRate: -10,
  },
  {
    stockCode: '000003',
    stockName: '삼성',
    quantity: 1,
    avgBuyPrice: 300,
    currentPrice: null,
    evaluationAmount: null,
    evaluationProfit: null,
    evaluationProfitRate: null,
  },
];
const parsedHoldings = holdings.map((holding) => HoldingSchema.parse(holding));

describe('sortHoldings', () => {
  it('수익률·평가금액의 오름차순과 내림차순을 지원한다', () => {
    expect(
      sortHoldings(parsedHoldings, 'profitRateDesc').map(
        ({ stockCode }) => stockCode,
      ),
    ).toEqual(['000001', '000002', '000003']);
    expect(
      sortHoldings(parsedHoldings, 'profitRateAsc').map(
        ({ stockCode }) => stockCode,
      ),
    ).toEqual(['000002', '000001', '000003']);
    expect(
      sortHoldings(parsedHoldings, 'evaluationDesc').map(
        ({ stockCode }) => stockCode,
      ),
    ).toEqual(['000002', '000001', '000003']);
    expect(
      sortHoldings(parsedHoldings, 'evaluationAsc').map(
        ({ stockCode }) => stockCode,
      ),
    ).toEqual(['000001', '000002', '000003']);
  });

  it('종목명을 가나다순으로 정렬한다', () => {
    expect(
      sortHoldings(parsedHoldings, 'nameAsc').map(({ stockCode }) => stockCode),
    ).toEqual(['000002', '000003', '000001']);
  });
});

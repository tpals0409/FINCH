import { describe, expect, it } from 'vitest';

import { AccountSummaryResponseSchema } from './account';
import { PortfolioResponseSchema } from './portfolio';
import { StockDetailResponseSchema } from './stock';

describe('평가 필드 nullable 계약', () => {
  it('계좌·종목 상세·포트폴리오의 미완성 평가 응답을 파싱한다', () => {
    expect(
      AccountSummaryResponseSchema.parse({
        cashBalance: 1_250_000,
        evaluationAmount: null,
        totalAsset: null,
        asOf: null,
      }),
    ).toMatchObject({
      evaluationAmount: null,
      totalAsset: null,
      asOf: null,
    });

    expect(
      StockDetailResponseSchema.parse({
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI',
        currentPrice: null,
        previousClose: 74_400,
        changeAmount: null,
        changeRate: null,
        suspended: false,
        suspendedReason: null,
        watched: false,
        asOf: null,
        holding: {
          quantity: 10,
          avgBuyPrice: 71_200,
          evaluationProfit: null,
          evaluationProfitRate: null,
        },
      }).holding,
    ).toMatchObject({
      evaluationProfit: null,
      evaluationProfitRate: null,
    });

    expect(
      PortfolioResponseSchema.parse({
        cashBalance: 1_250_000,
        evaluationAmount: null,
        totalAsset: null,
        asOf: null,
        holdings: [
          {
            stockCode: '005930',
            stockName: '삼성전자',
            quantity: 10,
            avgBuyPrice: 71_200,
            currentPrice: null,
            evaluationAmount: null,
            evaluationProfit: null,
            evaluationProfitRate: null,
          },
        ],
      }),
    ).toMatchObject({
      evaluationAmount: null,
      totalAsset: null,
      asOf: null,
      holdings: [
        {
          currentPrice: null,
          evaluationAmount: null,
          evaluationProfit: null,
          evaluationProfitRate: null,
        },
      ],
    });
  });
});

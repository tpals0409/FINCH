import { z } from 'zod';

import { PaymentMethodSchema } from './deposit';
import { createCursorPageSchema } from './pagination';
import {
  IsoDateTimeSchema,
  KrwAmountSchema,
  PercentSchema,
  QuantitySchema,
  StockCodeSchema,
} from './primitives';

/**
 * 잔고 · 매매 내역 (`docs/api/apiSpec.md` §8 잔고 · 매매 내역 API).
 *
 * 계산은 전부 서버가 원장 기준으로 한다. 화면은 받은 값을 표시만 한다.
 * `evaluationProfitRate` 는 **백분율**이다 — 서버가 이미 100 을 곱해서 내려준다
 * (apiSpec §8.1 계산식).
 */

/** 보유 종목 정렬 (apiSpec §8.1 보유 종목 목록). 기본은 `EVALUATION` 이다. */
export const PortfolioSortSchema = z.enum(['EVALUATION', 'PROFIT_RATE']);
export type PortfolioSort = z.infer<typeof PortfolioSortSchema>;

/** 보유 종목 한 줄 (apiSpec §8.1). */
export const HoldingSchema = z.object({
  stockCode: StockCodeSchema,
  stockName: z.string(),
  quantity: QuantitySchema,
  avgBuyPrice: KrwAmountSchema,
  currentPrice: KrwAmountSchema,
  /** 보유 수량 x 현재가 */
  evaluationAmount: KrwAmountSchema,
  /** (현재가 − 평균 매수가) x 보유 수량 */
  evaluationProfit: KrwAmountSchema,
  /** 백분율. 평가손익 / (평균 매수가 x 보유 수량) x 100 */
  evaluationProfitRate: PercentSchema,
});
export type Holding = z.infer<typeof HoldingSchema>;

/** `GET /portfolio` 응답 (apiSpec §8.1). 상단 요약과 보유 목록이 한 응답에 온다. */
export const PortfolioResponseSchema = z.object({
  cashBalance: KrwAmountSchema,
  evaluationAmount: KrwAmountSchema,
  totalAsset: KrwAmountSchema,
  asOf: IsoDateTimeSchema,
  holdings: z.array(HoldingSchema),
});
export type PortfolioResponse = z.infer<typeof PortfolioResponseSchema>;

/**
 * 원장 유형 (apiSpec §8.2 매매 내역, 명세 8장 원장 유형).
 * 초기 지급과 충전도 같은 내역에 섞여 온다.
 *
 * **apiSpec v0.7 에서 6종 → 4종이 됐다** — 투자 회차가 없어지면서
 * `ROUND_OPEN`·`ROUND_CLOSE` 가 삭제됐다 (이슈 #27).
 */
export const TransactionTypeSchema = z.enum([
  'INITIAL_GRANT',
  'DEPOSIT',
  'BUY',
  'SELL',
]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

/**
 * `GET /transactions` 의 `type` 필터 (apiSpec §8.2). 원장 유형 전체와 값이 다르다 —
 * `ALL` 이 더 있고 `INITIAL_GRANT` 가 없다.
 *
 * **미확정 (contracts P22)** — `type=DEPOSIT` 이 `INITIAL_GRANT` 행을 포함하는지 명세에 없다.
 * MR !78 에 물어 뒀고, 목은 포함하는 쪽으로 답해 둔다 (`mocks/handlers/trading.ts`
 * `TRANSACTION_FILTER_LEDGER_TYPES`). 사용자 입장에서 초기 지급 1,000,000원도 입금으로 읽힌다.
 */
export const TransactionFilterSchema = z.enum([
  'ALL',
  'BUY',
  'SELL',
  'DEPOSIT',
]);
export type TransactionFilter = z.infer<typeof TransactionFilterSchema>;

/**
 * 매매 내역 한 줄 (apiSpec §8.2).
 *
 * 유형마다 채워지는 필드가 다르다. 충전 행은 종목·가격·수량이 전부 `null` 이고
 * `paymentMethod` 가 차며, 매매 행은 그 반대다. **키가 빠지는 것이 아니라 `null` 로 온다.**
 */
export const TransactionSchema = z.object({
  transactionId: z.number().int(),
  type: TransactionTypeSchema,
  occurredAt: IsoDateTimeSchema,
  stockCode: StockCodeSchema.nullable(),
  stockName: z.string().nullable(),
  price: KrwAmountSchema.nullable(),
  quantity: QuantitySchema.nullable(),
  amount: KrwAmountSchema,
  realizedProfit: KrwAmountSchema.nullable(),
  /** 백분율 */
  realizedProfitRate: PercentSchema.nullable(),
  paymentMethod: PaymentMethodSchema.nullable(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * `GET /transactions` 응답 (apiSpec §8.2).
 * 커서 페이징이고 정렬은 최신순 고정이다. 종료 판정은 `hasNext` 로 한다.
 */
export const TransactionsResponseSchema =
  createCursorPageSchema(TransactionSchema);
export type TransactionsResponse = z.infer<typeof TransactionsResponseSchema>;

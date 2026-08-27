import { z } from 'zod';

import {
  IsoDateTimeSchema,
  KrwAmountSchema,
  QuantitySchema,
  StockCodeSchema,
} from './primitives';

/**
 * 주문 (`docs/api/apiSpec.md` §7 주문 API · `frontend/docs/contracts.md` C43~C46).
 *
 * **시장가 즉시 체결만 있다.** 지정가·미체결 관리·호가창은 범위 밖이고
 * 접수와 체결이 분리되지 않는다. **가격 입력 필드를 만들지 않는다.**
 * 그래서 주문 요청 스키마에 `price` 자리가 없다.
 *
 * `POST /orders` 는 `Idempotency-Key` 헤더가 필수다 (contracts C29).
 * **주문 뮤테이션은 자동 재시도하지 않는다.** 중복 주문이 된다.
 */

/** 매수·매도 (apiSpec §7.1 시장가 주문). */
export const OrderSideSchema = z.enum(['BUY', 'SELL']);
export type OrderSide = z.infer<typeof OrderSideSchema>;

/** `POST /orders` 요청 (apiSpec §7.1). */
export const OrderRequestSchema = z.object({
  stockCode: StockCodeSchema,
  side: OrderSideSchema,
  quantity: z.number().int().positive(),
});
export type OrderRequest = z.infer<typeof OrderRequestSchema>;

/**
 * `POST /orders` 응답 `201 Created` (apiSpec §7.1).
 * `realizedProfit` 은 매도일 때만 값이 있다.
 */
export const OrderResponseSchema = z.object({
  orderId: z.number().int(),
  stockCode: StockCodeSchema,
  stockName: z.string(),
  side: OrderSideSchema,
  quantity: QuantitySchema,
  executedPrice: KrwAmountSchema,
  executedAmount: KrwAmountSchema,
  executedAt: IsoDateTimeSchema,
  cashBalanceAfter: KrwAmountSchema,
  realizedProfit: KrwAmountSchema.nullable(),
});
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

/**
 * `GET /orders/available` 응답 (apiSpec §7.3 주문 가능 정보 조회 · contracts C45).
 *
 * 비율 버튼(10% / 25% / 50% / 최대)의 분모는 여기 `maxQuantity`·`holdingQuantity` 다.
 * **화면이 계산하지 않는다.**
 *
 * `tradable` 이 `false` 면 `reason` 에 주문 에러 코드 중 하나가 담긴다.
 * `reason` 을 union 이 아니라 `string` 으로 둔 이유는 목록에 없는 코드가 왔을 때
 * 파싱을 실패시키면 주문 화면 전체가 죽기 때문이다. 비교는
 * `shared/types/errorCodes.ts` 의 `ORDER_ERROR_CODES` 상수로 한다.
 */
export const OrderAvailableResponseSchema = z.object({
  tradable: z.boolean(),
  reason: z.string().nullable(),
  currentPrice: KrwAmountSchema,
  availableCash: KrwAmountSchema,
  maxQuantity: QuantitySchema,
  holdingQuantity: QuantitySchema,
});
export type OrderAvailableResponse = z.infer<
  typeof OrderAvailableResponseSchema
>;

/** `GET /orders/available` 쿼리 (apiSpec §7.3). */
export const OrderAvailableQuerySchema = z.object({
  stockCode: StockCodeSchema,
  side: OrderSideSchema,
});
export type OrderAvailableQuery = z.infer<typeof OrderAvailableQuerySchema>;

/**
 * 체결 직전 재검증에서 예상 금액과 실제 체결가가 갈릴 수 있다 (apiSpec §7.2 체결 처리 순서).
 * 서버는 수량을 임의로 줄여 체결하지 않고 주문을 거부하므로, 화면은
 * `ORDER_PRICE_CHANGED` 를 받으면 다시 시도하도록 안내한다. 여기에는 스키마가 없다.
 */

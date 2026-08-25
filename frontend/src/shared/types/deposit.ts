import { z } from 'zod';

import { IsoDateTimeSchema, KrwAmountSchema } from './primitives';

/**
 * 모의 결제(충전) (`docs/api/apiSpec.md` §4 모의 결제 (충전) API ·
 * `frontend/docs/contracts.md` C49).
 *
 * 경로는 `GET /deposits/limit` 과 `POST /deposits` 둘이고 에러 접두사는 `DEPOSIT_` 이다.
 * **충전 취소 API 는 없다.**
 * `POST /deposits` 는 `Idempotency-Key` 헤더가 필수다 (contracts C29).
 */

/** 시뮬레이션용 결제 수단 (apiSpec §4.2 충전). */
export const PaymentMethodSchema = z.enum(['VIRTUAL_CARD', 'VIRTUAL_TRANSFER']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * `GET /deposits/limit` 응답 (apiSpec §4.1 충전 한도 조회).
 * 1회 1,000만 원, 회차 누적 1억 원이다. 누적 한도는 계좌 리셋 시 초기화된다.
 */
export const DepositLimitResponseSchema = z.object({
  perRequestLimit: KrwAmountSchema,
  roundCumulativeLimit: KrwAmountSchema,
  roundDepositedAmount: KrwAmountSchema,
  remainingAmount: KrwAmountSchema,
});
export type DepositLimitResponse = z.infer<typeof DepositLimitResponseSchema>;

/** `POST /deposits` 요청 (apiSpec §4.2 충전). */
export const DepositRequestSchema = z.object({
  amount: z.number().int().positive(),
  paymentMethod: PaymentMethodSchema,
});
export type DepositRequest = z.infer<typeof DepositRequestSchema>;

/** `POST /deposits` 응답 `201 Created` (apiSpec §4.2 충전). */
export const DepositResponseSchema = z.object({
  depositId: z.number().int(),
  amount: KrwAmountSchema,
  paymentMethod: PaymentMethodSchema,
  cashBalanceAfter: KrwAmountSchema,
  depositedAt: IsoDateTimeSchema,
});
export type DepositResponse = z.infer<typeof DepositResponseSchema>;

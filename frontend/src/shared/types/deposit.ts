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
 * 1회 1,000만 원, **계정 전체 누적** 1억 원이다.
 *
 * **apiSpec v0.7 에서 필드 이름이 바뀌었다** — 누적 한도의 기준이 회차에서 계정 전체로
 * 옮겨가면서 `roundCumulativeLimit`·`roundDepositedAmount` 가
 * `cumulativeLimit`·`depositedAmount` 가 됐다. 회차가 없어져 한도를 되돌릴 경로도 없다 (이슈 #27).
 */
export const DepositLimitResponseSchema = z.object({
  perRequestLimit: KrwAmountSchema,
  /** 계정 전체 누적 한도 */
  cumulativeLimit: KrwAmountSchema,
  /** 계정 전체 누적 충전액 */
  depositedAmount: KrwAmountSchema,
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

import { z } from 'zod';

import { createItemsSchema } from './pagination';
import { IsoDateTimeSchema, KrwAmountSchema } from './primitives';

/**
 * 계좌 · 투자 회차 (`docs/api/apiSpec.md` §3 계좌 · 투자 회차 API ·
 * `frontend/docs/contracts.md` C26·C47·C48).
 *
 * 쓰기 요청은 **활성 회차**를 대상으로 하고 `roundId` 를 받지 않는다.
 * 조회는 선택적으로 받는다. 활성 회차는 항상 1개다.
 */

/** `GET /account` 응답 (apiSpec §3.1 계좌 요약 조회). 모든 값은 원장에서 계산한 서버 값이다. */
export const AccountSummaryResponseSchema = z.object({
  roundId: z.number().int(),
  /** 예수금 */
  cashBalance: KrwAmountSchema,
  /** 평가금액 = Σ(보유 수량 x 현재가) */
  evaluationAmount: KrwAmountSchema,
  /** 총자산 = 예수금 + 평가금액 */
  totalAsset: KrwAmountSchema,
  /** 시세 기준 시각. 화면에 "갱신 시각"으로 표시한다 */
  asOf: IsoDateTimeSchema,
});
export type AccountSummaryResponse = z.infer<
  typeof AccountSummaryResponseSchema
>;

/** 회차 상태 (apiSpec §3.3 회차 목록 조회). */
export const RoundStatusSchema = z.enum(['ACTIVE', 'CLOSED']);
export type RoundStatus = z.infer<typeof RoundStatusSchema>;

/**
 * 회차 한 건 (apiSpec §3.3). 매매 내역 화면의 회차 선택기에 쓴다.
 * 진행 중인 회차는 `closedAt`·`finalTotalAsset` 가 `null` 이다.
 */
export const RoundSchema = z.object({
  roundId: z.number().int(),
  status: RoundStatusSchema,
  startedAt: IsoDateTimeSchema,
  closedAt: IsoDateTimeSchema.nullable(),
  finalTotalAsset: KrwAmountSchema.nullable(),
});
export type Round = z.infer<typeof RoundSchema>;

/** `GET /rounds` 응답 (apiSpec §3.3). */
export const RoundListResponseSchema = createItemsSchema(RoundSchema);
export type RoundListResponse = z.infer<typeof RoundListResponseSchema>;

/**
 * `POST /account/reset` 응답 (apiSpec §3.2 계좌 리셋 · contracts C48).
 * 원장을 삭제하지 않는다. 현재 회차를 종료하고 새 회차를 열며 예수금을 재지급한다.
 * **누적 충전 한도도 함께 초기화된다.**
 */
export const AccountResetResponseSchema = z.object({
  closedRound: z.object({
    roundId: z.number().int(),
    startedAt: IsoDateTimeSchema,
    closedAt: IsoDateTimeSchema,
    finalTotalAsset: KrwAmountSchema,
  }),
  newRound: z.object({
    roundId: z.number().int(),
    startedAt: IsoDateTimeSchema,
    cashBalance: KrwAmountSchema,
  }),
});
export type AccountResetResponse = z.infer<typeof AccountResetResponseSchema>;

import { z } from 'zod';

import { IsoDateTimeSchema, KrwAmountSchema } from './primitives';

/**
 * 계좌 (`docs/api/apiSpec.md` §3 계좌 API · `frontend/docs/contracts.md` C26·C47).
 *
 * 계좌는 **사용자당 하나**이고 계정 생성과 함께 만들어진다. 요청에 계좌 식별자를 보내지 않고
 * 응답에도 내려오지 않는다 — 클라이언트가 지목할 대상이 아니다 (apiSpec §1.6).
 *
 * **투자 회차와 계좌 리셋은 apiSpec v0.7 에서 사라졌다** (이슈 #27). 원장은 계정 생성부터
 * 이어지는 하나의 연속된 시계열이라 `GET /rounds`·`POST /account/reset` 도 함께 없어졌다.
 */

/** `GET /account` 응답 (apiSpec §3.1 계좌 요약 조회). 모든 값은 원장에서 계산한 서버 값이다. */
export const AccountSummaryResponseSchema = z.object({
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

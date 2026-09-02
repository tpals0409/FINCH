import { z } from 'zod';

import {
  IsoDateTimeSchema,
  KrwAmountSchema,
  RatioSchema,
  StockCodeSchema,
} from '@/shared/types/primitives';

import {
  AiNumericIndicatorsSchema,
  AiFindingSeveritySchema,
  AiIndicatorsSchema,
} from './diagnosis';
import {
  AiSectionSchema,
  AiSegmentSchema,
  createAiResponseSchema,
} from './envelope';

/**
 * 주문 전 점검 (`ai/docs/api-spec.md` §7 주문 전 점검, `POST /ai/orders/preview`).
 *
 * 주문 체결을 가정한 포트폴리오에 진단 엔진을 다시 돌려 차분을 준다.
 * **승인·거절 판단은 하지 않는다.** 화면도 이 응답으로 주문을 막지 않는다 —
 * 주문 가능 여부는 백엔드 `GET /orders/available` 이 판정한다.
 */

/**
 * 요청에 오른 주문 한 줄 (AI 명세 §7 Request · Response `order_summary`).
 *
 * **`side` 가 소문자다.** 백엔드 주문 API 의 `BUY`/`SELL` 과 값이 다르므로 그대로 넘기지 않는다.
 * `price` 를 생략하면 현재가로 계산하고, 응답의 `orderSummary` 에 실제 쓰인 단가가 채워진다.
 * 종목코드 필드 이름은 AI 원본 그대로 `ticker` 다 (GitLab 이슈 #11 1번 회신, 2026-09-02).
 */
export const AiOrderPreviewOrderSchema = z.object({
  ticker: StockCodeSchema,
  side: z.enum(['buy', 'sell']),
  quantity: z.number().int().positive(),
  price: KrwAmountSchema.nullish(),
});
export type AiOrderPreviewOrder = z.infer<typeof AiOrderPreviewOrderSchema>;

/** `POST /ai/orders/preview` 요청 (AI 명세 §7 Request). 배열이라 리밸런싱 시나리오도 담긴다. */
export const AiOrderPreviewRequestSchema = z.object({
  orders: z.array(AiOrderPreviewOrderSchema).min(1),
});
export type AiOrderPreviewRequest = z.infer<typeof AiOrderPreviewRequestSchema>;

/** 응답의 주문 요약 한 줄. 요청 한 줄에 `amount` 가 더해진다 (AI 명세 §7). */
export const AiOrderPreviewSummaryRowSchema = z.object({
  ticker: StockCodeSchema,
  side: z.enum(['buy', 'sell']),
  quantity: z.number().int(),
  price: KrwAmountSchema,
  amount: KrwAmountSchema,
});
export type AiOrderPreviewSummaryRow = z.infer<
  typeof AiOrderPreviewSummaryRowSchema
>;

/**
 * 주문 전후 지표 (AI 명세 §7). 진단의 열한 키에 `topSectorWeight` 를 더한 **열두 키**이고
 * `before`·`after` 의 키 구성은 같다.
 */
export const AiOrderPreviewIndicatorsSchema = AiIndicatorsSchema.extend({
  topSectorWeight: RatioSchema.nullable(),
});
export type AiOrderPreviewIndicators = z.infer<
  typeof AiOrderPreviewIndicatorsSchema
>;

/**
 * `after − before` 차분 (AI 명세 §7).
 *
 * **숫자인 지표만 담긴다.** `rateSensitivity` 처럼 문자열이거나 한쪽이 `null` 인 지표는
 * **키째로 빠진다.** 이 자리만 `.optional()` 인 이유가 그것이다 — AI 응답의 `null` 규약(C54)에
 * 대한 예외이고, 서술이 아니라 구현이 그렇게 동작한다.
 */
export const AiOrderPreviewDeltaSchema = AiNumericIndicatorsSchema.extend({
  topSectorWeight: RatioSchema.nullable(),
}).partial();
export type AiOrderPreviewDelta = z.infer<typeof AiOrderPreviewDeltaSchema>;

/**
 * 이 주문 때문에 **새로 걸렸거나 등급이 올라간** 항목 (AI 명세 §7).
 * 나아진 항목은 요약이 말한다. 첫 발생이면 `before` 가 `null` 이다.
 */
export const AiOrderPreviewWarningSchema = z.object({
  id: z.string(),
  severity: AiFindingSeveritySchema,
  title: z.string(),
  metric: z.string(),
  before: RatioSchema.nullable(),
  after: RatioSchema,
  threshold: RatioSchema,
  text: z.string(),
  segments: z.array(AiSegmentSchema),
});
export type AiOrderPreviewWarning = z.infer<typeof AiOrderPreviewWarningSchema>;

/**
 * 기록된 논지와 어긋난 주문 (AI 명세 §7).
 * **사용자가 직접 진술한 항목(`user_stated`)만 쓴다.** AI 가 추론한 성향으로 주문에
 * 이의를 제기하면 근거 없는 참견이 된다. 충돌이 없으면 빈 배열이다.
 */
export const AiThesisConflictSchema = z.object({
  id: z.string(),
  ticker: StockCodeSchema,
  fact: z.string(),
  source: z.string(),
  recordedAt: IsoDateTimeSchema,
  conflict: z.string(),
  segments: z.array(AiSegmentSchema),
});
export type AiThesisConflict = z.infer<typeof AiThesisConflictSchema>;

/**
 * 주문 전 점검 본문 (AI 명세 §7 Response — content).
 *
 * `feasible` 이 `false` 면 현금 부족이고 부족액이 최상위 `shortfall` 에 담긴다.
 * **에러가 아니라 200 응답의 본문이다.** 부족하지 않으면 `null` 이다.
 */
export const AiOrderPreviewContentSchema = z.object({
  orderSummary: z.array(AiOrderPreviewSummaryRowSchema),
  ordersValue: KrwAmountSchema,
  feasible: z.boolean(),
  shortfall: KrwAmountSchema.nullable(),
  before: AiOrderPreviewIndicatorsSchema,
  after: AiOrderPreviewIndicatorsSchema,
  delta: AiOrderPreviewDeltaSchema,
  warnings: z.array(AiOrderPreviewWarningSchema),
  thesisConflicts: z.array(AiThesisConflictSchema),
  summary: AiSectionSchema.nullable(),
});
export type AiOrderPreviewContent = z.infer<typeof AiOrderPreviewContentSchema>;

/** POST /ai/orders/preview 응답. 본문에 보존 필드가 함께 실린다 (apiSpec §10.3). */
export const AiOrderPreviewResponseSchema = createAiResponseSchema(
  AiOrderPreviewContentSchema,
);
export type AiOrderPreviewResponse = z.infer<
  typeof AiOrderPreviewResponseSchema
>;

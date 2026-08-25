import { z } from 'zod';

import {
  IsoDateSchema,
  RatioSchema,
  StockCodeSchema,
  UnitIntervalSchema,
} from '@/shared/types/primitives';

import {
  AiSectionSchema,
  AiSegmentSchema,
  createAiResponseSchema,
} from './envelope';

/**
 * 수익률 원인 분석 (`ai/docs/api-spec.md` §6 수익률 원인 분석,
 * `POST /ai/portfolio/attribution`).
 *
 * 수익률을 시장·섹터·종목 선택으로 분해한다. 원안의 환율(FX) 기여도는 국내 단일 시장에서
 * 성립하지 않아 제거됐다.
 *
 * **여기 수익률·비중은 전부 0~1 소수다.** 백엔드 `changeRate` 계열의 백분율과 다르다 —
 * `portfolioReturn: 0.0213` 은 +2.13% 이고 화면에서 100 을 곱한다.
 */

/** 분석 기간 (AI 명세 §6 Request). 생략하면 `1d` 다. 다른 값은 `INVALID_REQUEST` 다. */
export const AiAttributionPeriodSchema = z.enum([
  '1d',
  '1w',
  '1m',
  '3m',
  'ytd',
]);
export type AiAttributionPeriod = z.infer<typeof AiAttributionPeriodSchema>;

/**
 * `POST /ai/portfolio/attribution` 요청 (AI 명세 §6 Request).
 *
 * `benchmark` 는 **받기만 하고 쓰이지 않는다**(C56). 벤치마크는 항상 보유 종목 유니버스를
 * 시가총액으로 합성한 시장 전체라 무엇을 보내든 결과가 같다.
 * **벤치마크 선택 UI 를 만들지 않는다.** 스키마에 자리만 남긴다.
 */
export const AiAttributionRequestSchema = z.object({
  period: AiAttributionPeriodSchema.nullish(),
  benchmark: z.string().nullish(),
});
export type AiAttributionRequest = z.infer<typeof AiAttributionRequestSchema>;

/**
 * 기여 종목에 연결된 이벤트 (AI 명세 §6).
 *
 * **`title` 과 `summary` 에 같은 문자열이 온다**(C56). 별도 요약 패스가 없어 제목을 그대로 쓴다.
 * 프론트는 둘 중 한쪽만 읽는다.
 *
 * `matchedConfidence` 는 가격 변동과 이벤트의 연결 강도다. **0.6 미만이면 인과 표현을 쓰지 않는다** —
 * 문장 자체를 AI 가 그렇게 만들어 보내므로 프론트가 다시 판정할 일은 없다.
 */
export const AiAttributionEventSchema = z.object({
  citationId: z.string(),
  type: z.string(),
  title: z.string(),
  summary: z.string(),
  eventDate: IsoDateSchema,
  matchedConfidence: UnitIntervalSchema,
});
export type AiAttributionEvent = z.infer<typeof AiAttributionEventSchema>;

/**
 * 기여·감소 종목 한 줄 (AI 명세 §6). `contributors` 와 `detractors` 가 같은 모양이고
 * 기여도 부호로 갈린다.
 *
 * 종목코드 필드 이름이 `ticker` 인지 `stockCode` 인지는 미확정이다(contracts P2).
 * AI 원본 이름을 그대로 뒀다. 회신이 오면 이 디렉토리만 고친다.
 */
export const AiAttributionRowSchema = z.object({
  ticker: StockCodeSchema,
  name: z.string(),
  sector: z.string(),
  weight: RatioSchema,
  /** `return` 은 예약어라 camelCase 변환 결과가 특히 불확실하다 (contracts T2) */
  return: RatioSchema,
  contribution: RatioSchema,
  heldAtStart: z.boolean(),
  events: z.array(AiAttributionEventSchema),
});
export type AiAttributionRow = z.infer<typeof AiAttributionRowSchema>;

/** 섹터별 배분·선택 효과 (AI 명세 §6). `proxy` 는 섹터 벤치마크를 대체 지표로 채웠다는 뜻이다. */
export const AiAttributionSectorSchema = z.object({
  sector: z.string(),
  portfolioWeight: RatioSchema,
  benchmarkWeight: RatioSchema,
  allocation: RatioSchema,
  selection: RatioSchema,
  proxy: z.boolean(),
});
export type AiAttributionSector = z.infer<typeof AiAttributionSectorSchema>;

/**
 * 수익률 원인 분석 본문 (AI 명세 §6 Response — content).
 *
 * **중복 키 두 쌍이 그대로 남아 있다**(C56). `portfolioReturn`/`totalReturn` 이 같은 값이고,
 * `summary` 와 `text`+`segments` 도 같은 내용이다 — `summary` 가 Section 전체이고
 * `text`·`segments` 는 그중 두 키를 최상위로 다시 펼친 것이다. **프론트는 각 쌍에서 한쪽만 읽는다.**
 * 생성이 막히면 셋 다 `null` 이다.
 *
 * `start`·`end`·`tradingDays` 는 실제로 되짚은 구간이라 `period` 만으로는 알 수 없다.
 */
export const AiAttributionContentSchema = z.object({
  period: AiAttributionPeriodSchema,
  start: IsoDateSchema,
  end: IsoDateSchema,
  tradingDays: z.number().int().nonnegative(),
  portfolioReturn: RatioSchema,
  /** `portfolioReturn` 과 같은 값이다 */
  totalReturn: RatioSchema,
  benchmarkReturn: RatioSchema,
  excessReturn: RatioSchema,
  breakdown: z.object({
    market: RatioSchema,
    sector: RatioSchema,
    selection: RatioSchema,
  }),
  contributors: z.array(AiAttributionRowSchema),
  detractors: z.array(AiAttributionRowSchema),
  sectors: z.array(AiAttributionSectorSchema),
  /** 계산 중 붙은 단서 문자열. 없으면 빈 배열이다 */
  notes: z.array(z.string()),
  summary: AiSectionSchema.nullable(),
  /** `summary.text` 와 같다 */
  text: z.string().nullable(),
  /** `summary.segments` 와 같다 */
  segments: z.array(AiSegmentSchema).nullable(),
});
export type AiAttributionContent = z.infer<typeof AiAttributionContentSchema>;

/** POST /ai/portfolio/attribution 응답. 본문에 보존 필드가 함께 실린다 (apiSpec §10.3). */
export const AiAttributionResponseSchema = createAiResponseSchema(
  AiAttributionContentSchema,
);
export type AiAttributionResponse = z.infer<typeof AiAttributionResponseSchema>;

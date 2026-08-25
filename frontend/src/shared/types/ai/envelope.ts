import { z } from 'zod';

import {
  IsoDateTimeSchema,
  UnitIntervalSchema,
} from '@/shared/types/primitives';

/**
 * AI 응답의 공통 조각 (`ai/docs/api-spec.md` §2.2 공통 응답 봉투 · §2.3 서술과 수치의 분리 ·
 * §2.4 citations · §12 공통 타입 · `docs/api/apiSpec.md` §10.3 응답 재포장 규칙 ·
 * `frontend/docs/contracts.md` C7 · C53~C56).
 *
 * **프론트가 받는 것은 AI 서버의 원본이 아니라 백엔드가 재포장한 응답이다.**
 * 백엔드가 AI 봉투를 벗기고 `camelCase` 로 바꿔 내려준다(C7). 그래서 여기 키는 전부
 * `camelCase` 이고 `snake_case` 자리가 없다.
 *
 * **`null` 규약이 백엔드 성공 응답과 같다** — 선언된 키는 값이 없어도 빠지지 않고 `null` 로 온다(C54).
 * 그래서 AI 스키마는 `.optional()` 이 아니라 `.nullable()` 로 짠다. 키 존재 여부로 분기하면
 * 값이 `null` 로 온 순간 조용히 틀린다.
 *
 * **전송은 전부 단발 요청/응답이다. SSE 는 폐기됐다**(C4, AI 명세 §2.5).
 * 스트림 파서를 만들지 않는다.
 */

/**
 * `segments[].unit` 과 `source` 의 확인된 값 (AI 명세 §12 Segment).
 *
 * 스키마에서 열거형으로 굳히지 않고 `string` 으로 받는 이유는 이 어휘가 AI 파트 소유이고
 * 문서와 구현이 벌어져 있기 때문이다(contracts §4 관측 · P7). 모르는 단위 하나 때문에
 * AI 카드 전체가 파싱 실패로 사라지는 것이 더 나쁘다. 아래 상수는 스타일링 분기의
 * 기본값을 고를 때 쓴다.
 */
export const AI_SEGMENT_UNITS = [
  'ratio',
  'krw',
  'count',
  'days',
  'score',
] as const;
export type AiSegmentUnit = (typeof AI_SEGMENT_UNITS)[number];

export const AI_SEGMENT_SOURCES = [
  'portfolio_engine',
  'risk_engine',
  'attribution_engine',
  'price',
  'filing',
] as const;
export type AiSegmentSource = (typeof AI_SEGMENT_SOURCES)[number];

/**
 * 문장 조각 (AI 명세 §2.3 · §12 Segment · contracts C55).
 *
 * **여섯 키는 `text` 조각에도 전부 실려 나온다.** `value` 를 뺀 넷이 `null` 일 뿐이라
 * 판별 유니언으로 짜지 않는다.
 *
 * `direction` 은 `up`/`down`/`null` 이고 국내 관례에 따라 상승 적색·하락 청색이다.
 * 색은 값이 아니라 의미 토큰으로 참조한다.
 */
export const AiSegmentSchema = z.object({
  type: z.enum(['text', 'metric']),
  value: z.string(),
  /** 원시 값. 차트·정렬 등 2차 가공에 쓴다. `metric` 조각에서만 찬다 */
  raw: z.number().nullable(),
  unit: z.string().nullable(),
  source: z.string().nullable(),
  direction: z.enum(['up', 'down']).nullable(),
});
export type AiSegment = z.infer<typeof AiSegmentSchema>;

/**
 * 서술 한 덩어리 (AI 명세 §12 Section · contracts C55).
 *
 * **`text` 만 출력해도 정상 동작하는 기본 렌더링 경로다.** `segments` 는 수치 스타일링이
 * 필요할 때만 순회한다. 이어 붙이면 `text` 와 정확히 일치한다.
 *
 * `cached`·`cachedAt` 은 캐시 계층이 없어 항상 `false`/`null` 이다(C56).
 * **캐시 배지 UI 를 만들 이유가 없다.**
 */
export const AiSectionSchema = z.object({
  title: z.string().nullable(),
  text: z.string(),
  segments: z.array(AiSegmentSchema),
  cached: z.boolean(),
  cachedAt: IsoDateTimeSchema.nullable(),
});
export type AiSection = z.infer<typeof AiSectionSchema>;

/** `citations[].type` 의 확인된 값 (AI 명세 §2.4 citations). 어휘 확장 여지가 있어 `string` 으로 받는다. */
export const AI_CITATION_TYPES = [
  'filing',
  'financial',
  'news',
  'price',
  'macro',
  'engine',
  'wiki',
] as const;
export type AiCitationType = (typeof AI_CITATION_TYPES)[number];

/**
 * 근거 (AI 명세 §2.4 · §12 Citation). 서술 안에서 `[^cit_2]` 형태로 참조한다.
 * `type: 'engine'` 은 자체 계산 결과라 외부 `url` 이 없다.
 */
export const AiCitationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  source: z.string(),
  publisher: z.string().nullable(),
  url: z.string().nullable(),
  publishedAt: IsoDateTimeSchema.nullable(),
  snippet: z.string().nullable(),
  relevance: UnitIntervalSchema,
});
export type AiCitation = z.infer<typeof AiCitationSchema>;

/**
 * 데이터 원천별 기준 시각 (AI 명세 §2.2 · apiSpec §10.3 보존 필드 `dataAsOf`).
 *
 * **UI 에 반드시 노출한다.** 시세는 지연될 수 있어 생성 시각과 따로 관리한다.
 * 다섯 키는 항상 실려 나오고, 읽지 않은 원천은 키가 빠지는 것이 아니라 값이 `null` 이다.
 */
export const AiDataAsOfSchema = z.object({
  price: IsoDateTimeSchema.nullable(),
  portfolio: IsoDateTimeSchema.nullable(),
  filings: IsoDateTimeSchema.nullable(),
  news: IsoDateTimeSchema.nullable(),
  macro: IsoDateTimeSchema.nullable(),
});
export type AiDataAsOf = z.infer<typeof AiDataAsOfSchema>;

/**
 * 백엔드가 재포장한 뒤에도 본문에 남는 필드 (apiSpec §10.3 응답 재포장 규칙 · contracts C7).
 *
 * 앞의 넷은 **화면 노출 필수라 보존이 약속된 것**이고, 뒤의 셋은 봉투에만 있던 값이라
 * 재포장 후 남는지 확인되지 않았다(contracts P4). 뒤의 셋만 `.optional()` 인 이유가 그것이다 —
 * AI 응답의 `null` 규약(C54)에 대한 예외가 아니라, **키가 아예 없을 수 있는 자리**이기 때문이다.
 * 받아만 두고 쓰지 않는다. `cached` 는 캐시 계층이 없어 항상 `false` 라 배지를 만들 이유도 없다(C56).
 *
 * `disclaimer` 는 모든 AI 응답에 노출한다. **하드코딩하지 않고 응답 값을 표시한다** —
 * 규제 문구가 바뀌면 서버만 고치게 하기 위해서다.
 */
const aiResponseMetaShape = {
  /** `POST /ai/feedback` 이 이 값으로 원본 응답을 찾는다. 에러 응답에도 보존된다 (C14) */
  requestId: z.string(),
  dataAsOf: AiDataAsOfSchema,
  citations: z.array(AiCitationSchema),
  disclaimer: z.string(),
  generatedAt: IsoDateTimeSchema.optional(),
  model: z.string().optional(),
  cached: z.boolean().optional(),
};

/** 재포장 후에도 남는 필드만 따로 필요할 때 쓴다. */
export const AiResponseMetaSchema = z.object(aiResponseMetaShape);
export type AiResponseMeta = z.infer<typeof AiResponseMetaSchema>;

/**
 * AI 응답 스키마를 만든다. **재포장 형태에 대한 가정이 이 함수 하나에 갇혀 있다.**
 *
 * §10.3 이 "봉투를 벗기고 봉투 없이 재포장"한다고 적었고 §1.3 이 "성공 시 봉투 없이
 * 리소스를 그대로" 내려준다고 적었으므로, **`content` 의 키가 본문 최상위로 올라오고
 * 보존 필드가 그 옆에 붙는 형태**로 읽었다.
 *
 * 이 독법은 확인되지 않았다 — `content` 키가 그대로 남는 형태로도 읽힌다.
 * 질문을 `_inbox/2026-08-25-질문-백엔드-AI재포장-형태-미발송.md` 에 올려 뒀다.
 * **회신이 `content` 유지로 오면 이 함수만 고친다.** 각 도메인의 content 스키마와
 * 화면 코드는 그대로다.
 */
export function createAiResponseSchema<TShape extends z.ZodRawShape>(
  contentSchema: z.ZodObject<TShape>,
) {
  return contentSchema.extend(aiResponseMetaShape);
}

/**
 * 본문 키 구성을 단정할 수 없는 AI 응답용. 보존 필드만 검증하고 나머지는 통과시킨다.
 * 지금은 `analysis` 하나가 이 자리에 있다.
 */
export const AiUnknownContentResponseSchema =
  z.looseObject(aiResponseMetaShape);
export type AiUnknownContentResponse = z.infer<
  typeof AiUnknownContentResponseSchema
>;

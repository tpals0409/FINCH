import { z } from 'zod';

import { IsoDateTimeSchema, StockCodeSchema } from '@/shared/types/primitives';

import { createAiResponseSchema } from './envelope';

/**
 * 사용자 위키 — "AI가 이해한 나" (`ai/docs/api-spec.md` §9 · contracts C60~C63 · C79 · C80).
 *
 * 중계 3종이다. `POST /wiki/theses` 는 AI 서비스가 스스로 부르는 경로라 프론트에 없다(C80).
 * 키 목록과 nullable 여부는 `ai/docs/openapi.json` 의 `WikiContent`·`WikiFactOut`·
 * `WikiThesisOut`·`DeletedFactContent`·`ThesisIn` 에서 그대로 옮겼다(C79).
 *
 * 열거값은 `z.string()` 으로 받는다. 이 어휘는 AI 파트 소유이고, 모르는 값 하나 때문에
 * 위키 전체가 파싱 실패로 사라지는 것이 더 나쁘다 — `envelope.ts` 의 `unit`·`source` 와 같은 판단이다.
 * 아래 상수는 화면이 분기의 **기본값**을 고를 때 쓴다.
 */

/**
 * 항목의 출처 (`WikiSource`).
 *
 * **`ai_inferred` 는 단정투로 렌더링하면 안 된다** (AI 응답 정책 §4.2). AI 가 추측한 것이라
 * "…하시는군요" 가 아니라 "…가 맞나요?" 로 물어야 한다. 모르는 값이 오면 이쪽으로 취급한다 —
 * 확신 없는 문장을 단정으로 보여주는 쪽이 그 반대보다 나쁘다.
 */
export const AI_WIKI_SOURCES = [
  'user_stated',
  'derived_from_trades',
  'ai_inferred',
] as const;
export type AiWikiSource = (typeof AI_WIKI_SOURCES)[number];

/** 사용자가 직접 말한 것만 단정투로 보여준다. 나머지는 전부 추측이다. */
export function isUserStated(source: string): boolean {
  return source === 'user_stated';
}

export const AI_WIKI_CONFIDENCES = ['low', 'medium', 'high'] as const;
export type AiWikiConfidence = (typeof AI_WIKI_CONFIDENCES)[number];

export const AI_THESIS_HORIZONS = ['short', 'mid', 'long'] as const;
export type AiThesisHorizon = (typeof AI_THESIS_HORIZONS)[number];

export const AI_THESIS_STATUSES = ['active', 'closed'] as const;
export type AiThesisStatus = (typeof AI_THESIS_STATUSES)[number];

/**
 * 사용자 맥락 한 줄 (`WikiFactOut`).
 *
 * `evidence` 는 자유 형식 객체다(`additionalProperties: true`). 키 구성을 단정할 수 없어
 * 통과시킨다 — 화면은 이 값을 읽지 않고, 나중에 근거를 펼칠 때 여기서 꺼낸다.
 * `editable` 이 `false` 인 항목은 삭제 버튼을 붙이지 않는다.
 */
export const AiWikiFactSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string(),
  confidence: z.string(),
  asOf: IsoDateTimeSchema,
  evidence: z.looseObject({}),
  editable: z.boolean(),
});
export type AiWikiFact = z.infer<typeof AiWikiFactSchema>;

/**
 * 투자 논지 (`WikiThesisOut`).
 *
 * **`ticker` 를 `stockCode` 로 바꾸지 않는다** — 백엔드 중계는 키 표기만 바꾸고 이름은
 * 그대로 둔다 (apiSpec §10.3). 경로 파라미터만 `{stockCode}` 다.
 */
export const AiWikiThesisSchema = z.object({
  id: z.string(),
  ticker: StockCodeSchema,
  text: z.string(),
  horizon: z.string().nullable(),
  source: z.string(),
  status: z.string(),
  linkedTradeId: z.string().nullable(),
  recordedAt: IsoDateTimeSchema,
});
export type AiWikiThesis = z.infer<typeof AiWikiThesisSchema>;

export const AiWikiContentSchema = z.object({
  profile: z.array(AiWikiFactSchema),
  theses: z.array(AiWikiThesisSchema),
});
export type AiWikiContent = z.infer<typeof AiWikiContentSchema>;

export const AiWikiResponseSchema = createAiResponseSchema(AiWikiContentSchema);
export type AiWikiResponse = z.infer<typeof AiWikiResponseSchema>;

/** 논지 글자 수 상한. `ThesisIn.text` 가 `maxLength: 500` 이다. */
export const AI_THESIS_TEXT_MAX_LENGTH = 500;

/**
 * `PUT /ai/wiki/theses/{stockCode}` 요청 본문 (`ThesisIn` · contracts C60).
 *
 * 서버는 **경로의 종목코드를 기준으로 처리하고 본문의 `ticker` 는 무시한다.**
 * 그래도 본문에 채워 보낸다 — 호환을 위해 그렇게 하기로 회신을 받았다.
 */
export const AiThesisUpdateSchema = z.object({
  ticker: StockCodeSchema,
  text: z.string().trim().min(1).max(AI_THESIS_TEXT_MAX_LENGTH),
  horizon: z.string().nullish(),
  linkedTradeId: z.string().nullish(),
});
export type AiThesisUpdate = z.infer<typeof AiThesisUpdateSchema>;

/** `PUT` 응답의 `content` 는 갱신된 논지 전체다 (C61). */
export const AiThesisUpdateResponseSchema =
  createAiResponseSchema(AiWikiThesisSchema);

/** `DELETE` 응답의 `content` 는 `{id, deletedAt}` 이다 (C61). 소프트 삭제라 행은 남는다. */
export const AiDeletedFactResponseSchema = createAiResponseSchema(
  z.object({ id: z.string(), deletedAt: IsoDateTimeSchema }),
);

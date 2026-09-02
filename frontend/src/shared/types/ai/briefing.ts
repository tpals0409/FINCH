import { z } from 'zod';

import {
  IsoDateSchema,
  IsoDateTimeSchema,
  StockCodeSchema,
  UnitIntervalSchema,
} from '@/shared/types/primitives';

import {
  AiCitationSchema,
  AiSegmentSchema,
  createAiResponseSchema,
} from './envelope';

/**
 * 데일리 브리핑 (`ai/docs/api-spec.md` §8 데일리 브리핑, `GET /ai/briefing`).
 *
 * **AI 중계 7종 가운데 이것만 GET 이다**(C3). 배치 생성 결과를 조회할 뿐 생성 트리거가 아니다.
 * `date` 를 생략하면 당일이다.
 */

/**
 * 브리핑 상태 (AI 명세 §8).
 *
 * - `ready` — 정상 표시
 * - `empty` — 보유 종목이 없거나 내보낼 항목이 없다. `items` 가 빈 배열이고 **오류가 아니다.** 영역을 숨긴다
 * - `generating` — **현재 구현은 이 값을 내보내지 않는다**(C56). 요청 시점에 생성하기 때문이다.
 *   그래서 **스켈레톤 + 30초 뒤 재조회 경로를 만들지 않는다.** 값은 스키마에 남겨 둔다 —
 *   배치가 붙으면 다시 나오고, 그때 파싱이 깨지지 않아야 한다
 */
export const AiBriefingStatusSchema = z.enum(['ready', 'generating', 'empty']);
export type AiBriefingStatus = z.infer<typeof AiBriefingStatusSchema>;

/** `items[].category` 의 확인된 값 (AI 명세 §8). */
export const AI_BRIEFING_CATEGORIES = [
  'holding_move',
  'earnings',
  'filing',
  'macro_event',
  'portfolio_shift',
] as const;
export type AiBriefingCategory = (typeof AI_BRIEFING_CATEGORIES)[number];

/**
 * 브리핑 항목 (AI 명세 §8). 최대 4건이다.
 *
 * `relevanceScore` 는 LLM 이 아니라 규칙 엔진이 매긴다.
 * `citations` 는 **현재 구현에서 항상 빈 배열**이다(C56) — 이 기능은 일정·시세에서 항목을 뽑을 뿐
 * 문서를 조회하지 않는다. **빈 배열을 실패로 다루지 않는다.**
 */
export const AiBriefingItemSchema = z.object({
  rank: z.number().int().positive(),
  category: z.string(),
  relevanceScore: UnitIntervalSchema,
  title: z.string(),
  text: z.string(),
  segments: z.array(AiSegmentSchema),
  relatedTickers: z.array(StockCodeSchema),
  /** 화면 내 이동 경로 (`/stocks/000660?tab=ai`). 라우터 경로와 대조해서 쓴다 */
  deeplink: z.string(),
  citations: z.array(AiCitationSchema),
});
export type AiBriefingItem = z.infer<typeof AiBriefingItemSchema>;

/**
 * 데일리 브리핑 본문 (AI 명세 §8 Response — content).
 *
 * 네 키는 항상 실려 나온다. 조회 시 `date` 를 주지 않았고 기준 거래일도 못 잡았으면
 * `date` 가 `null` 일 수 있다.
 *
 * **봉투와 이름이 겹치지 않는다** — 봉투에도 응답 생성 시각 `generated_at` 이 있었지만
 * 재포장 시 걷어내고(GitLab 이슈 #10 5번 회신, 2026-09-02), `content` 는 컨테이너째 남으므로
 * (이슈 #22 회신) 이 배치 생성 시각은 `content.generatedAt` 자리에 그대로 있다.
 */
export const AiBriefingContentSchema = z.object({
  date: IsoDateSchema.nullable(),
  status: AiBriefingStatusSchema,
  generatedAt: IsoDateTimeSchema,
  items: z.array(AiBriefingItemSchema),
});
export type AiBriefingContent = z.infer<typeof AiBriefingContentSchema>;

/** `GET /ai/briefing` 쿼리 (AI 명세 §8). 생략하면 당일이다. */
export const AiBriefingQuerySchema = z.object({
  date: IsoDateSchema.nullish(),
});
export type AiBriefingQuery = z.infer<typeof AiBriefingQuerySchema>;

/** GET /ai/briefing 응답. 본문에 보존 필드가 함께 실린다 (apiSpec §10.3). */
export const AiBriefingResponseSchema = createAiResponseSchema(
  AiBriefingContentSchema,
);
export type AiBriefingResponse = z.infer<typeof AiBriefingResponseSchema>;

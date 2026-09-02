import { z } from 'zod';

import { StockCodeSchema } from '@/shared/types/primitives';

import { AiSectionSchema, createAiResponseSchema } from './envelope';

/**
 * AI 대화 (`ai/docs/api-spec.md` §4 AI 대화, `POST /ai/chat`).
 *
 * 여섯 기능 중 유일한 도구 호출 에이전트다. 투자 용어 질의도 이 엔드포인트가 담당한다.
 */

/** `context.screen` 의 확인된 값 (AI 명세 §4 Request). 대명사 지시 대상을 푸는 화면 맥락이다. */
export const AI_CHAT_SCREENS = [
  'home',
  'portfolio',
  'stock_detail',
  'order',
  'chat',
] as const;
export type AiChatScreen = (typeof AI_CHAT_SCREENS)[number];

/**
 * `POST /ai/chat` 요청 (AI 명세 §4 Request).
 *
 * `conversationId` 를 생략하면 새 대화가 시작되고 응답이 발급한 값을 이후에 그대로 쓴다.
 * `message` 는 공백만으로는 안 되고 2,000자를 넘으면 `INVALID_REQUEST` 다.
 *
 * **요청 본문 키 표기도 camelCase 다** (GitLab 이슈 #12 3번 회신, 2026-09-02).
 * AI 서버로 넘길 때의 snake_case 변환은 백엔드 중계 레이어가 맡으므로,
 * 프론트는 요청·응답 양방향에 camelCase 하나만 쓴다.
 */
export const AiChatRequestSchema = z.object({
  conversationId: z.string().nullish(),
  message: z.string().trim().min(1).max(2000),
  context: z
    .object({
      screen: z.string(),
      /** 종목 맥락. 필드 이름은 AI 원본 그대로 `ticker` 다 (GitLab 이슈 #11 1번 회신) */
      ticker: StockCodeSchema.nullish(),
    })
    .nullish(),
});
export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

/**
 * AI 대화 본문 (AI 명세 §4 Response — content).
 *
 * `answer` 는 Section 다섯 키를 그대로 쓴다. 다만 **`answer.title` 은 항상 `null`** 이라
 * 말풍선 제목은 프론트가 정한다(C53). `toolsUsed` 는 이번 답변에서 실제로 호출된 Tool 이름이고
 * 호출 순서는 보장되지 않는다. 도구가 필요 없는 질문이면 빈 배열이다.
 */
export const AiChatContentSchema = z.object({
  conversationId: z.string(),
  answer: AiSectionSchema,
  toolsUsed: z.array(z.string()),
});
export type AiChatContent = z.infer<typeof AiChatContentSchema>;

/** POST /ai/chat 응답. 본문에 보존 필드가 함께 실린다 (apiSpec §10.3). */
export const AiChatResponseSchema = createAiResponseSchema(AiChatContentSchema);
export type AiChatResponse = z.infer<typeof AiChatResponseSchema>;

import { z } from 'zod';

import { createAiResponseSchema } from './envelope';

/**
 * 응답 피드백 (`ai/docs/api-spec.md` §10 응답 피드백, `POST /ai/feedback`).
 *
 * AI 응답 영역마다 붙는 평가 슬롯이다. **`requestId` 가 있는 응답에만 슬롯을 만든다** —
 * `AI_UPSTREAM_UNAVAILABLE`·`AI_UPSTREAM_TIMEOUT` 은 백엔드 자체 에러라 `requestId` 가
 * 없고 찾을 원본 응답도 없다 (contracts C14·C70).
 *
 * 요청·응답 타입의 사실 원천은 `ai/docs/openapi.json` 의 `FeedbackIn` ·
 * `Envelope_FeedbackContent_` · `FeedbackContent` 다 (contracts C79 — 전용 pydantic
 * 모델이 들어와 손으로 옮겨 적는 제약이 풀린 다섯 경로 중 하나다).
 */

/** `rating` 열거값 (openapi `FeedbackRating`). 별점이 아니라 두 갈래다. */
export const AI_FEEDBACK_RATINGS = ['up', 'down'] as const;
export type AiFeedbackRating = (typeof AI_FEEDBACK_RATINGS)[number];

/**
 * `reasons` 열거값 (openapi `FeedbackReason`, AI 명세 §10). **복수 선택이다.**
 *
 * 여섯 값이 전부이고 AI 파트가 이 분포로 프롬프트 개선 우선순위를 정한다.
 * 다른 어휘를 프론트가 늘려 보내면 집계가 어긋나므로 여기서는 `string` 이 아니라
 * 열거형으로 굳혔다 — `segments[].unit` 계열(P7)과 달리 값 목록이 스키마에 확정돼 있다.
 */
export const AI_FEEDBACK_REASONS = [
  'wrong_number',
  'not_relevant',
  'outdated',
  'too_generic',
  'unclear',
  'wrong_citation',
] as const;
export type AiFeedbackReason = (typeof AI_FEEDBACK_REASONS)[number];

/** `comment` 최대 길이 (openapi `FeedbackIn.comment.maxLength`). */
export const AI_FEEDBACK_COMMENT_MAX_LENGTH = 1000;

/**
 * `POST /ai/feedback` 요청 (openapi `FeedbackIn`).
 *
 * **요청 본문 키 표기도 camelCase 다** (GitLab 이슈 #12 3번 회신, contracts C75).
 * AI 서버의 `request_id` → 프론트는 `requestId` 로 보내고 변환은 백엔드 중계가 맡는다.
 *
 * 필수는 `requestId`·`rating` 둘이다. `reasons`·`comment` 는 `rating: 'up'` 에서
 * 대개 비어 있다.
 *
 * **같은 `requestId` 로 다시 보내면 마지막 값으로 덮어쓴다** (contracts C66, AI 명세 §10).
 * 평가 행이 누적되지 않으므로 화면은 전송 뒤에도 수정을 열어 둘 수 있다.
 * **취소(평가 삭제) API 는 Phase 1 에 없다** — 완전한 취소 버튼을 만들지 않는다.
 */
export const AiFeedbackRequestSchema = z.object({
  /** 평가 대상 응답의 `requestId`. 화면이 이 값을 보관하고 있어야 슬롯을 붙일 수 있다 */
  requestId: z.string().min(1),
  rating: z.enum(AI_FEEDBACK_RATINGS),
  reasons: z.array(z.enum(AI_FEEDBACK_REASONS)).nullish(),
  comment: z.string().max(AI_FEEDBACK_COMMENT_MAX_LENGTH).nullish(),
});
export type AiFeedbackRequest = z.infer<typeof AiFeedbackRequestSchema>;

/**
 * 피드백 접수 본문 (openapi `FeedbackContent`). **키가 `recorded` 하나뿐이고 항상 `true` 다**
 * (이슈 #13 4번 회신, contracts C62 — openapi 에서도 `const: true` 다).
 *
 * 값으로 분기할 것이 없다. `false` 가 오는 경로는 없고, 실패는 에러 응답으로 온다.
 * 화면은 이 본문의 내용을 읽지 않고 성공 여부만 본다.
 */
export const AiFeedbackContentSchema = z.object({
  recorded: z.literal(true),
});
export type AiFeedbackContent = z.infer<typeof AiFeedbackContentSchema>;

/**
 * `POST /ai/feedback` 응답 (openapi `Envelope_FeedbackContent_`).
 *
 * **다른 여섯 종과 같은 재포장 형태다** — `content` 컨테이너에 보존 필드 넷이 나란히 붙는다
 * (이슈 #22, contracts C7). 접수 응답이라 `citations` 는 빈 배열이고 `dataAsOf` 다섯 키는
 * `null` 이지만, **키 자체가 빠지지는 않는다**(C54) — 그래서 여기서도 봉투를 벗기지 않는다.
 */
export const AiFeedbackResponseSchema = createAiResponseSchema(
  AiFeedbackContentSchema,
);
export type AiFeedbackResponse = z.infer<typeof AiFeedbackResponseSchema>;

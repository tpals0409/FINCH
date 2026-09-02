import { z } from 'zod';

/**
 * 에러 응답 스키마.
 *
 * 출처: `docs/api/apiSpec.md` §1.3 응답 형식 (실패 본문) ·
 * `frontend/docs/contracts.md` C8 에러 응답 형식 · C14 요청 추적.
 *
 * **성공 응답과 규칙이 다르다.**
 * - 에러의 `detail` 은 값이 없으면 **필드 자체가 사라진다** → `.optional()`
 * - 성공 DTO 의 빈 값은 **`null` 로 명시해서 내려온다** → `.nullable()`
 *
 * 두 규칙을 한 헬퍼로 묶지 않는다. 묶으면 성공 응답에서 키 존재 여부로 분기하게 되고,
 * 그 분기는 값이 `null` 로 온 순간 조용히 틀린다.
 *
 * `isSuccess` 같은 성공 여부 필드는 없다 (apiSpec §1.3).
 */

/**
 * `detail` 은 화면 표시에 필요한 부가 값이다 (apiSpec §1.3).
 * 검증 실패면 `{필드명: 사유}` 맵이고, 그 밖에는 코드마다 키가 다르다
 * (예: `ORDER_INSUFFICIENT_CASH` 의 `{required, available}`).
 * 키 구성이 코드마다 달라 값은 `unknown` 으로 둔다. 읽는 쪽이 좁힌다.
 */
export const ErrorDetailSchema = z.record(z.string(), z.unknown());
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

/**
 * 백엔드 자체 에러. `{code, message, detail}` 이다.
 *
 * `code` 를 union 이 아니라 `string` 으로 둔 이유는 엔드포인트별 전체 목록이
 * 아직 없기 때문이다 (contracts P6, GitLab 이슈 #4). 목록에 없는 코드가 오면
 * union 은 파싱을 실패시키고, 그러면 **에러를 표시하려다 에러 처리 자체가 죽는다.**
 * 분기는 `shared/types/errorCodes.ts` 의 상수와 비교해서 한다.
 *
 * `message` 는 서버가 완성해 주는 사용자 노출용 문구다. 그대로 화면에 쓴다.
 */
export const ErrorResponseSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  detail: ErrorDetailSchema.optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * AI 중계 경로(apiSpec §10)의 에러. **최상위 `requestId` 가 더 실린다** (§1.3 예외 · §10.3 · C14).
 * `POST /ai/feedback` 이 이 값으로 원본 응답을 찾으므로 피드백 슬롯을 붙일 수 있는지가
 * 이 필드의 유무로 갈린다. **백엔드 자체 에러에는 이 필드가 없다.**
 *
 * 백엔드가 AI 에 도달하지 못해 스스로 만드는 `AI_UPSTREAM_UNAVAILABLE`·`AI_UPSTREAM_TIMEOUT`
 * 에는 **최상위 `requestId` 가 없다** (GitLab 이슈 #12 4번 회신, 2026-09-02 · apiSpec §10.4).
 * AI 서버가 응답하지 않아 `POST /ai/feedback` 으로 찾을 원본 응답 자체가 없기 때문이다.
 * 그 응답은 이 스키마로 파싱되지 않고 `ErrorResponseSchema` 로 떨어지며,
 * 피드백 슬롯을 만들지 않는 것이 맞는 처리다.
 */
export const AiErrorResponseSchema = ErrorResponseSchema.extend({
  requestId: z.string().min(1),
});
export type AiErrorResponse = z.infer<typeof AiErrorResponseSchema>;

/**
 * 응답 본문이 에러 형식인지 확인하고 파싱한다. 아니면 `null` 이다.
 * **던지지 않는다.** 에러 경로에서 다시 던지면 원래 실패가 무엇이었는지 사라진다.
 */
export function parseErrorResponse(payload: unknown): ErrorResponse | null {
  const parsed = ErrorResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/** AI 중계 에러인지 — `requestId` 가 실려 있는지로 판정한다. */
export function parseAiErrorResponse(payload: unknown): AiErrorResponse | null {
  const parsed = AiErrorResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

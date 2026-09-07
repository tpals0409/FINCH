import { isHttpError } from '@/shared/api';
import {
  AI_RELAY_ERROR_CODES,
  AI_SERVICE_ERROR_CODES,
} from '@/shared/types/errorCodes';
import { Button } from '@/shared/ui/Button';

/**
 * AI 실패를 화면 문구로 옮긴다. **분기는 상태 코드가 아니라 `code` 로 한다** —
 * 401 을 내는 주체가 우리 하나가 아니라서 숫자로 나누면 AI 의 `UNAUTHORIZED` 까지
 * 세션 만료로 오인한다 (`shared/api/errors.ts`).
 *
 * 재시도 버튼을 붙일지가 이 표의 요점이다. 다시 눌러도 결과가 같은 실패에 버튼을 주면
 * 사용자는 소용없는 일을 반복한다.
 */
const RETRYABLE: readonly string[] = [
  AI_RELAY_ERROR_CODES.UPSTREAM_UNAVAILABLE,
  AI_RELAY_ERROR_CODES.UPSTREAM_TIMEOUT,
  AI_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
  AI_SERVICE_ERROR_CODES.LLM_TIMEOUT,
];

/**
 * `INSUFFICIENT_DATA` 와 `GUARDRAIL_BLOCKED` 는 재시도해도 같은 답이 온다.
 * 앞은 데이터가 쌓여야 하고 뒤는 답하지 않기로 한 질문이다 (contracts C12).
 */
export function AiErrorNotice({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const code = isHttpError(error) ? error.code : null;
  // 서버 문구는 사용자에게 그대로 보여도 되는 한국어다 (apiSpec §1.3).
  const message = isHttpError(error)
    ? error.message
    : 'AI 응답을 불러오지 못했어요';
  const retryable = code === null || RETRYABLE.includes(code);

  return (
    <div role="alert">
      <p className="text-body-2 text-fg-neutral-subtle">{message}</p>
      {code === AI_SERVICE_ERROR_CODES.INSUFFICIENT_DATA ? (
        <p className="mt-1 text-caption text-fg-neutral-subtle">
          거래가 쌓이면 다시 볼 수 있어요
        </p>
      ) : null}
      {retryable && onRetry !== undefined ? (
        <Button onClick={onRetry} className="mt-3">
          다시 시도
        </Button>
      ) : null}
    </div>
  );
}

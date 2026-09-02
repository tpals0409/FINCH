import { HttpResponse, type JsonBodyType } from 'msw';

import { IDEMPOTENCY_KEY_HEADER } from '@/shared/config/apiContract';
import { COMMON_ERROR_CODES } from '@/shared/types/errorCodes';

import { errorResponse } from './http';

/**
 * 멱등성 모의 (apiSpec §1.4 · contracts C29·C30). `POST /deposits` 와 `POST /orders` 가 쓴다.
 *
 * **상태 유지 범위** — 처리한 키와 그 결과를 모듈 변수에 담는다. 새로고침하면 사라진다.
 * 24시간 보관 규칙은 흉내 내지 않는다. 화면이 확인할 것은 세 갈래의 응답 모양이지
 * 만료 시점이 아니다.
 *
 * ## 어느 요청이 어느 갈래를 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | `Idempotency-Key` 헤더 없음 | `400 IDEMPOTENCY_KEY_REQUIRED` |
 * | 키가 `a` 로 시작하고 **그 키의 첫 요청** | `409 IDEMPOTENCY_IN_PROGRESS`. 같은 키로 다시 보내면 정상 처리된다 (재시도 성공 경로) |
 * | 처음 보는 키 | 정상 처리하고 결과를 키와 함께 저장 |
 * | 이미 처리된 키 + 같은 본문 | 저장한 최초 결과를 같은 상태 코드로 되돌려준다 |
 * | 이미 처리된 키 + 다른 본문 | `409 IDEMPOTENCY_CONFLICT` |
 *
 * `a` 접두사를 고른 이유 — UUID v4 의 첫 글자는 16진수 아무 값이나 될 수 있어
 * 평범한 키와 형식이 같다. 인가 코드 접두사 방식(`fail`·`expire`·`new`)과 같은 요령이다.
 * 화면이 이 갈래를 보려면 `Idempotency-Key: aaaaaaaa-...` 로 보내면 된다.
 *
 * 멱등성 판정은 본문 검증보다 **앞선다** — 키가 없으면 본문이 틀려도 `IDEMPOTENCY_KEY_REQUIRED` 다.
 */

/** 이 접두사로 시작하는 키의 첫 요청은 `IDEMPOTENCY_IN_PROGRESS` 다. */
const IN_PROGRESS_KEY_PREFIX = 'a';

interface StoredResult {
  requestBodyKey: string;
  status: number;
  body: JsonBodyType;
}

const storedResults = new Map<string, StoredResult>();
const inProgressServedKeys = new Set<string>();

export type IdempotencyCheck =
  | { blocked: true; response: HttpResponse<JsonBodyType> }
  | {
      blocked: false;
      /** 처리 결과를 키에 저장한다. 같은 키·같은 본문의 재시도가 이 값을 그대로 받는다. */
      commit: (
        status: number,
        body: JsonBodyType,
      ) => HttpResponse<JsonBodyType>;
    };

/** 헤더와 요청 본문을 보고 진행할지 막을지 정한다. */
export function checkIdempotency(
  request: Request,
  requestBody: unknown,
): IdempotencyCheck {
  const key = request.headers.get(IDEMPOTENCY_KEY_HEADER);

  if (key === null || key === '') {
    return {
      blocked: true,
      response: errorResponse(
        COMMON_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
        '요청 식별자가 필요합니다',
        400,
      ),
    };
  }

  if (
    key.startsWith(IN_PROGRESS_KEY_PREFIX) &&
    !inProgressServedKeys.has(key)
  ) {
    inProgressServedKeys.add(key);
    return {
      blocked: true,
      response: errorResponse(
        COMMON_ERROR_CODES.IDEMPOTENCY_IN_PROGRESS,
        '앞선 요청을 처리하고 있어요. 잠시 후 다시 시도해 주세요',
        409,
      ),
    };
  }

  const requestBodyKey = JSON.stringify(requestBody ?? null);
  const stored = storedResults.get(key);

  if (stored !== undefined) {
    if (stored.requestBodyKey !== requestBodyKey) {
      return {
        blocked: true,
        response: errorResponse(
          COMMON_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          '같은 요청 식별자로 다른 내용이 전송됐습니다',
          409,
        ),
      };
    }

    return {
      blocked: true,
      response: HttpResponse.json(stored.body, { status: stored.status }),
    };
  }

  return {
    blocked: false,
    commit: (status, body) => {
      storedResults.set(key, { requestBodyKey, status, body });
      return HttpResponse.json(body, { status });
    },
  };
}

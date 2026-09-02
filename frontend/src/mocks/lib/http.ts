import { HttpResponse, type JsonBodyType } from 'msw';

import { API_BASE_PATH } from '@/shared/config/apiContract';

/**
 * 목 핸들러가 공유하는 HTTP 도구.
 *
 * 에러 본문은 `{code, message, detail}` 이고 `isSuccess` 는 없다 (apiSpec §1.3).
 * `code` 문자열을 여기서 직접 적지 않는다 — 호출부가 `shared/types/errorCodes.ts`
 * 상수를 넘긴다.
 */

/** `*` 로 시작해 오리진 설정이 절대 주소든 상대 주소든 같은 핸들러가 잡히게 한다. */
export function mockPath(path: string): string {
  return `*${API_BASE_PATH}${path}`;
}

/** 에러 응답. `detail` 은 값이 없으면 키 자체가 빠진다 (apiSpec §1.3). */
export function errorResponse(
  code: string,
  message: string,
  status: number,
  detail?: Record<string, unknown>,
): HttpResponse<JsonBodyType> {
  return HttpResponse.json(
    detail === undefined ? { code, message } : { code, message, detail },
    { status },
  );
}

/** AI 중계 에러. 최상위 `requestId` 가 더 실린다 (apiSpec §10.3 · contracts C14). */
export function aiErrorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
  detail?: Record<string, unknown>,
): HttpResponse<JsonBodyType> {
  return HttpResponse.json(
    detail === undefined
      ? { code, message, requestId }
      : { code, message, detail, requestId },
    { status },
  );
}

/** 쿼리 파라미터를 읽는다. 없으면 `null` 이다. */
export function searchParam(request: Request, name: string): string | null {
  return new URL(request.url).searchParams.get(name);
}

/**
 * 요청 본문을 읽는다. **파싱에 실패하면 `null`** 이다 — 호출부가 `INVALID_REQUEST` 로 답한다
 * (apiSpec §11.1 — 본문 JSON 파싱 실패는 `detail` 없는 `INVALID_REQUEST` 다).
 * 던지게 두면 화면은 400 대신 정체 모를 예외를 받는다.
 */
export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await request.json();
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

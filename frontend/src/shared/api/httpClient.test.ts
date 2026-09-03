import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { setAuthBridge, type AuthBridge } from '@/shared/api/authBridge';
import { AUTH_ERROR_CODES } from '@/shared/types/errorCodes';

import { request } from './httpClient';

/**
 * `recoverSession`(httpClient.ts, export 되지 않음)의 부팅 경합 방어를
 * 공개 API(`request`)를 통해 검증한다.
 *
 * 방어 내용 — "보낸 토큰 ≠ 현재 토큰이면 세션을 건드리지 않는다." 토큰 없이 나간 요청의
 * 401 은 우리 세션에 대한 판정이 아니고(부팅 복구가 끝나기 전에 출발한 요청), 보낸 토큰이
 * 이미 갱신돼 낡아진 경우도 마찬가지다. 이 가드가 없으면 방금 복구된 세션을 낡은 응답이
 * 지워버려 "로그인이 조용히 풀리는" 버그가 난다.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const dummySchema = z.object({ ok: z.boolean() });

function makeBridge(overrides: Partial<AuthBridge> = {}): AuthBridge {
  return {
    getAccessToken: () => null,
    refreshSession: vi.fn(async () => null),
    onSessionExpired: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthBridge(makeBridge());
});

describe('recoverSession 의 부팅 경합 방어 (httpClient.request 를 통해 검증)', () => {
  it('토큰 없이 나간 요청의 401 은 세션을 건드리지 않는다', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(401, {
        code: AUTH_ERROR_CODES.TOKEN_EXPIRED,
        message: '만료',
      }),
    );
    const onSessionExpired = vi.fn();
    const refreshSession = vi.fn(async () => 'new-token');
    setAuthBridge(
      makeBridge({
        getAccessToken: () => null,
        refreshSession,
        onSessionExpired,
      }),
    );

    await expect(
      request('/whatever', { schema: dummySchema }),
    ).rejects.toMatchObject({ code: AUTH_ERROR_CODES.TOKEN_EXPIRED });

    expect(refreshSession).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
    // 토큰 없이 나갔으므로 재시도(두 번째 fetch)도 없다.
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('보낸 토큰이 이미 갱신돼 낡았으면 방금 복구된 세션을 지우지 않는다', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(401, {
        code: AUTH_ERROR_CODES.TOKEN_EXPIRED,
        message: '만료',
      }),
    );
    const onSessionExpired = vi.fn();
    const refreshSession = vi.fn(async () => 'even-newer-token');
    // 요청을 보낼 때는 old-token 이 실렸지만, 응답을 처리하는 시점에는 이미
    // new-token 으로 갱신된 상태 — 낡은 401 응답이 뒤늦게 도착한 경합 상황이다.
    const getAccessToken = vi
      .fn<AuthBridge['getAccessToken']>()
      .mockReturnValueOnce('old-token')
      .mockReturnValue('new-token');
    setAuthBridge(
      makeBridge({ getAccessToken, refreshSession, onSessionExpired }),
    );

    await expect(
      request('/whatever', { schema: dummySchema }),
    ).rejects.toMatchObject({ code: AUTH_ERROR_CODES.TOKEN_EXPIRED });

    expect(refreshSession).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('보낸 토큰 = 현재 토큰이면 정상적으로 재발급 후 재시도한다', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse(401, {
          code: AUTH_ERROR_CODES.TOKEN_EXPIRED,
          message: '만료',
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const onSessionExpired = vi.fn();
    const refreshSession = vi.fn(async () => 'refreshed-token');
    setAuthBridge(
      makeBridge({
        getAccessToken: () => 'same-token',
        refreshSession,
        onSessionExpired,
      }),
    );

    const result = await request('/whatever', { schema: dummySchema });

    expect(result).toEqual({ ok: true });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
});

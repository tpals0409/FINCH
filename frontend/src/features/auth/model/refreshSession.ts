import { postTokenRefresh } from '../api/postTokenRefresh';

import { useAuthSession } from './useAuthSession';

/**
 * 진행 중인 재발급. **동시에 두 번 나가지 않게 붙잡아 두는 자리다.**
 *
 * 왜 필요한가 — 화면 하나가 뜨면서 요청 서너 개가 동시에 나가는 것은 흔하다.
 * Access Token 이 막 만료됐다면 그 전부가 동시에 401 을 받고, 각자 재발급을 부른다.
 * 서버는 회전 방식이라 재발급마다 Refresh Token 을 새로 발급하고 옛것을 버리므로,
 * 두 번째 재발급은 첫 번째가 방금 버린 토큰을 들고 가서 실패한다.
 * **재발급을 병렬로 부르면 자기가 자기 세션을 끊는다.**
 *
 * 그래서 먼저 부른 쪽의 Promise 를 공유한다. 나머지는 새 요청을 만들지 않고
 * 그 결과를 기다렸다가 같은 토큰을 받아 간다.
 */
let inFlightRefresh: Promise<string | null> | null = null;

async function runRefresh(): Promise<string | null> {
  const { renewAccessToken, clearSession } = useAuthSession.getState();

  try {
    const { accessToken } = await postTokenRefresh();
    renewAccessToken(accessToken);
    return accessToken;
  } catch {
    /**
     * 실패 이유를 여기서 나누지 않는다.
     * `AUTH_REFRESH_TOKEN_MISSING`(쿠키 없음)이든 `AUTH_INVALID_TOKEN`(만료·회전 충돌)이든
     * 결과는 같다 — 지금 이 브라우저에는 되살릴 세션이 없다.
     * 둘을 나누는 것은 **화면 이동을 할지 말지**이고 그건 라우트 가드의 판단이다.
     * 여기서 로그인 화면으로 보내면 최초 방문자까지 튕긴다 (apiSpec §2.2).
     */
    clearSession();
    return null;
  }
}

/**
 * Access Token 을 다시 받아 온다. 실패하면 `null` 이고 세션은 비워진 상태다.
 * 여러 번 불러도 요청은 한 번만 나간다.
 */
export function refreshSession(): Promise<string | null> {
  inFlightRefresh ??= runRefresh().finally(() => {
    inFlightRefresh = null;
  });

  return inFlightRefresh;
}

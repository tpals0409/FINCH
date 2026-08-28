import { postTokenRefresh } from '../api/postTokenRefresh';

import { useAuthSession } from './useAuthSession';

/**
 * 진행 중인 재발급. 동시에 두 번 나가지 않게 붙잡아 둔다.
 *
 * 서버가 회전 방식이라 재발급마다 옛 Refresh Token 을 버린다. 만료된 요청 여러 개가
 * 각자 재발급을 부르면 두 번째가 첫 번째가 방금 버린 토큰을 들고 가서 실패한다.
 * 병렬로 부르면 자기 세션을 자기가 끊는다.
 */
let inFlightRefresh: Promise<string | null> | null = null;

async function runRefresh(): Promise<string | null> {
  try {
    const { accessToken } = await postTokenRefresh();
    useAuthSession.getState().renewAccessToken(accessToken);
    return accessToken;
  } catch {
    /**
     * 실패해도 여기서 세션을 비우지 않는다. 무엇을 할지는 부른 쪽이 정한다.
     * 부팅 복구는 콜백 화면에서 로그인 교환과 병렬로 도는데, 여기서 비우면
     * 순서가 뒤집혔을 때 방금 성공한 로그인을 덮어쓴다.
     *
     * 실패 이유는 나누지 않는다. 쿠키가 없든 무효하든 "지금 되살릴 세션이 없다"로
     * 결과가 같고, 둘을 나누는 것은 화면 이동 여부라 가드의 판단이다 (apiSpec §2.2).
     */
    return null;
  }
}

/** 여러 번 불러도 요청은 한 번만 나간다. 실패하면 null. */
export function refreshSession(): Promise<string | null> {
  inFlightRefresh ??= runRefresh().finally(() => {
    inFlightRefresh = null;
  });

  return inFlightRefresh;
}

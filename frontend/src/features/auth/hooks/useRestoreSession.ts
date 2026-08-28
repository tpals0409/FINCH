import { useEffect, useRef } from 'react';

import { refreshSession } from '../model/refreshSession';
import { useAuthSession } from '../model/useAuthSession';

/** 카카오 콜백 라우트 (ia.md §1). KAKAO_REDIRECT_URI 의 경로 부분과 같다. */
const OAUTH_CALLBACK_PATH = '/oauth/kakao';

/**
 * 부팅 시 세션을 한 번 복구한다. 이 호출이 없으면 새로고침할 때마다 로그아웃된다 —
 * 로그인은 살아 있는데(Refresh 쿠키가 남아 있다) 프론트만 모르는 상태가 된다.
 *
 * 최초 방문자에게 실패하는 것은 정상이라 조용히 넘긴다. 백엔드가
 * AUTH_REFRESH_TOKEN_MISSING 을 따로 주는 이유도 이것이다 (apiSpec §2.2).
 */
export function useRestoreSession(): void {
  // 회전 방식이라 StrictMode 의 두 번째 실행이 첫 번째가 버린 토큰을 쓰게 된다.
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    /**
     * 콜백 화면에서는 복구하지 않는다. 지금 로그인 교환이 진행 중이라 복구할 세션이
     * 따로 없고, 두 요청이 병렬로 Refresh Token 을 회전시키면 서로를 무효화한다.
     * 늦게 끝난 쪽이 먼저 끝난 쪽의 토큰을 덮어쓰는 경쟁도 여기서 생긴다.
     */
    if (window.location.pathname === OAUTH_CALLBACK_PATH) {
      return;
    }

    void refreshSession().then(() => {
      // 복구가 실패했으면 여기서 비로그인으로 확정한다. refreshSession 은 실패해도
      // 세션을 건드리지 않으므로(부르는 쪽이 정한다) 그 판단이 이 자리에 있다.
      if (useAuthSession.getState().status === 'unknown') {
        useAuthSession.getState().clearSession();
      }
    });
  }, []);
}

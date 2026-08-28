import { useEffect, useRef } from 'react';

import { refreshSession } from '../model/refreshSession';

/**
 * 앱 부팅 시 세션을 한 번 복구한다.
 *
 * **왜 필요한가.** Access Token 은 메모리에만 있어서 새로고침·탭 재열기로 사라진다.
 * 이 호출이 없으면 사용자는 새로고침할 때마다 로그아웃된다 — 로그인 자체는 살아 있는데
 * (Refresh 쿠키가 남아 있다) 프론트만 그것을 모르는 상태가 된다.
 *
 * **최초 방문자에게 이 요청이 실패하는 것은 정상이다.** 쿠키가 없으니 당연하다.
 * 그래서 실패를 화면에 띄우지 않고 조용히 비로그인으로 넘긴다. 백엔드가
 * `AUTH_REFRESH_TOKEN_MISSING`(쿠키 없음)과 `AUTH_INVALID_TOKEN`(만료)을 나눠 주는 이유도
 * 이것이다 — 섞어 주면 처음 온 사람이 "세션이 만료됐습니다"를 보게 된다 (apiSpec §2.2).
 */
export function useRestoreSession(): void {
  /**
   * StrictMode 는 이펙트를 두 번 돌린다. 재발급은 회전 방식이라 두 번째 호출이
   * 첫 번째가 방금 버린 토큰을 쓰게 되고, 그러면 부팅하자마자 세션이 끊긴다.
   * (`refreshSession` 의 단일 비행이 한 겹 더 막아 주지만, 첫 번째가 끝난 뒤
   * 두 번째가 도는 순서라면 그것만으로는 부족하다.)
   */
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    void refreshSession();
  }, []);
}

import { setAuthBridge } from '@/shared/api';

import { refreshSession } from './refreshSession';
import { useAuthSession } from './useAuthSession';

/**
 * shared/api 가 뚫어 둔 자리에 세션 구현을 꽂는다. 부팅 때 한 번 부른다.
 * 훅이 아닌 이유 — 첫 요청보다 먼저 꽂혀 있어야 한다. 컴포넌트 안에서 꽂으면
 * 그보다 먼저 나간 요청에 토큰이 붙지 않는다.
 */
export function installAuthBridge(): void {
  setAuthBridge({
    // 매번 스토어에서 새로 읽는다. 캡처하면 재발급 뒤에도 옛 토큰이 실린다.
    getAccessToken: () => useAuthSession.getState().accessToken,
    refreshSession,
    onSessionExpired: () => useAuthSession.getState().clearSession(),
  });
}

import { setAuthBridge } from '@/shared/api';

import { refreshSession } from './refreshSession';
import { useAuthSession } from './useAuthSession';

/**
 * `shared/api` 가 뚫어 둔 자리에 세션 구현을 꽂는다. 앱 부팅 때 **한 번** 부른다.
 *
 * 이 방향이라 의존 규칙을 지킬 수 있다. `shared/api` 는 `features/auth` 를 모르고,
 * `features/auth` 가 자신을 등록한다. 그래서 인증을 쓰지 않는 화면만 있는 상태에서도
 * `shared/api` 는 그대로 동작한다.
 *
 * 훅이 아니라 평범한 함수인 이유 — 컴포넌트가 마운트되기 전에 꽂혀 있어야 한다.
 * 렌더 중에 꽂으면 그보다 먼저 나간 요청에 토큰이 안 붙는다.
 */
export function installAuthBridge(): void {
  setAuthBridge({
    // 매번 스토어에서 새로 읽는다. 값을 캡처해 두면 재발급 뒤에도 옛 토큰이 실린다.
    getAccessToken: () => useAuthSession.getState().accessToken,
    refreshSession,
    onSessionExpired: () => useAuthSession.getState().clearSession(),
  });
}

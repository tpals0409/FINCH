/**
 * HTTP 클라이언트가 세션을 다루는 데 필요한 동작의 자리. 구현은 여기 없다.
 *
 * 의존 방향이 단방향이라 shared/api 는 세션 스토어가 있는 features/auth 를
 * import 할 수 없다 (컨벤션 §2). 모양만 여기 두고 app 이 부팅 때 꽂는다.
 * 꽂히기 전에도 요청은 나간다 — 토큰이 안 붙을 뿐이다.
 */
export type AuthBridge = {
  getAccessToken: () => string | null;
  /** 동시에 여러 번 불려도 요청은 한 번만 나가야 한다. 보장은 구현 쪽 책임이다. */
  refreshSession: () => Promise<string | null>;
  /** 화면 이동이 아니라 상태 정리만 한다. */
  onSessionExpired: () => void;
};

let bridge: AuthBridge | null = null;

export function setAuthBridge(next: AuthBridge): void {
  bridge = next;
}

export function getAuthBridge(): AuthBridge | null {
  return bridge;
}

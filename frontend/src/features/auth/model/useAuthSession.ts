import { create } from 'zustand';

import { type AuthUser } from '@/shared/types/auth';

/**
 * 로그인 여부는 **세 상태**다 (컨벤션 §4).
 *
 * `unknown` 이 없으면 앱이 뜨자마자 "비로그인"으로 판정된다. Access Token 은 메모리에만
 * 있어서 새로고침하면 사라지고, 되찾는 방법은 부팅 시 `POST /auth/refresh` 한 번인데
 * 그 응답이 오기 전까지는 로그인했는지 **아직 모르는** 것이지 안 한 것이 아니다.
 * 두 상태로 다루면 새로고침할 때마다 로그인 화면이 한 번 번쩍이고 홈으로 넘어간다.
 *
 * - `unknown` — 초기값. 부팅 복구가 끝나기 전
 * - `unauthenticated` — 복구를 시도했고 세션이 없음이 확인됨
 * - `authenticated` — Access Token 을 갖고 있음
 */
export type AuthStatus = 'unknown' | 'unauthenticated' | 'authenticated';

type AuthSessionState = {
  status: AuthStatus;
  /**
   * **메모리에만 둔다.** `localStorage`·`sessionStorage` 에 쓰지 않는다 (컨벤션 §4).
   * 스토리지에 두면 XSS 로 들어온 스크립트가 `localStorage.getItem` 한 줄로 토큰을
   * 통째로 가져간다. 메모리 변수라고 XSS 에 안전한 것은 아니지만, 탭을 닫으면 사라지고
   * 다른 탭·이전 세션의 토큰이 남아 있지 않다는 차이가 있다.
   *
   * Refresh Token 은 `HttpOnly` 쿠키라 JS 가 아예 못 읽으므로 여기 자리가 없다.
   */
  accessToken: string | null;
  user: AuthUser | null;
  /** 최초 로그인이면 서버가 계좌·1회차·예수금을 함께 만든 것이다 (apiSpec §2.1). */
  isNewUser: boolean;
  setSession: (session: {
    accessToken: string;
    user: AuthUser;
    isNewUser: boolean;
  }) => void;
  /** 로그아웃과 세션 만료에서 함께 쓴다. 결과는 둘 다 "세션 없음이 확인된 상태"다. */
  clearSession: () => void;
};

const EMPTY_SESSION = {
  status: 'unauthenticated',
  accessToken: null,
  user: null,
  isNewUser: false,
} as const;

/**
 * 인증 세션 스토어.
 *
 * React 밖에서도 읽어야 한다 — HTTP 클라이언트가 요청마다 토큰을 붙이고 401 을 만나면
 * 세션을 비워야 하는데 그건 컴포넌트가 아니다. zustand 는 `useAuthSession.getState()` /
 * `.setState()` 로 훅 밖 접근을 열어 주므로 Context 와 달리 별도 통로를 만들 필요가 없다.
 * 그 접근을 실제로 쓰는 인터셉터는 별도 MR 이다.
 */
export const useAuthSession = create<AuthSessionState>((set) => ({
  ...EMPTY_SESSION,
  status: 'unknown',
  setSession: ({ accessToken, user, isNewUser }) =>
    set({ status: 'authenticated', accessToken, user, isNewUser }),
  clearSession: () => set({ ...EMPTY_SESSION }),
}));

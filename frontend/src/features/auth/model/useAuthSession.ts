import { create } from 'zustand';

import { type AuthUser } from '@/shared/types/auth';

/**
 * 세 상태인 이유. 앱이 뜨는 순간 Access Token 은 반드시 없고(메모리라서)
 * 부팅 복구 응답은 그 뒤에 온다. 그 구간을 unauthenticated 로 두면 가드가 즉시
 * 로그인 화면으로 보냈다가 복구 성공에 되돌아와 화면이 번쩍인다 (컨벤션 §4).
 */
export type AuthStatus = 'unknown' | 'unauthenticated' | 'authenticated';

type AuthSessionState = {
  status: AuthStatus;
  /**
   * 메모리에만 둔다 (컨벤션 §4). 스토리지에 두면 XSS 로 들어온 스크립트가
   * 한 줄로 가져간다. Refresh Token 은 HttpOnly 쿠키라 여기 자리가 없다.
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
  /** 로그아웃과 세션 만료가 함께 쓴다. 결과는 둘 다 "세션 없음이 확인된 상태"다. */
  clearSession: () => void;
};

const EMPTY_SESSION = {
  status: 'unauthenticated',
  accessToken: null,
  user: null,
  isNewUser: false,
} as const;

/**
 * React 밖에서도 읽어야 한다 — 요청마다 토큰을 붙이고 401 을 만나면 세션을 비우는 것은
 * 컴포넌트가 아니다. zustand 는 getState() 로 훅 밖 접근을 열어 준다.
 */
export const useAuthSession = create<AuthSessionState>((set) => ({
  ...EMPTY_SESSION,
  status: 'unknown',
  setSession: ({ accessToken, user, isNewUser }) =>
    set({ status: 'authenticated', accessToken, user, isNewUser }),
  clearSession: () => set({ ...EMPTY_SESSION }),
}));

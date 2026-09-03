import { create } from 'zustand';

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
  /** 최초 로그인이면 서버가 계좌·예수금을 함께 만든 것이다 (apiSpec §2.1). */
  isNewUser: boolean;
  setSession: (session: { accessToken: string; isNewUser: boolean }) => void;
  /** 재발급 성공. isNewUser 는 건드리지 않는다 — 재발급은 가입이 아니다. */
  renewAccessToken: (accessToken: string) => void;
  /** 로그아웃과 세션 만료가 함께 쓴다. 결과는 둘 다 "세션 없음이 확인된 상태"다. */
  clearSession: () => void;
};

/**
 * 사용자 정보는 여기 없다. 닉네임·프로필은 서버가 원본을 갖는 서버 상태라
 * GET /users/me 쿼리가 유일한 출처다 (컨벤션 §4).
 */
export const useAuthSession = create<AuthSessionState>((set) => ({
  status: 'unknown',
  accessToken: null,
  isNewUser: false,
  setSession: ({ accessToken, isNewUser }) =>
    set({ status: 'authenticated', accessToken, isNewUser }),
  renewAccessToken: (accessToken) =>
    set({ status: 'authenticated', accessToken }),
  clearSession: () =>
    set({ status: 'unauthenticated', accessToken: null, isNewUser: false }),
}));

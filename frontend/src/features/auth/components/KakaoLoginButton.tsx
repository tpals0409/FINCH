import { KAKAO_REST_API_KEY } from '@/shared/config/env';

import { buildKakaoAuthorizeUrl } from '../lib/buildKakaoAuthorizeUrl';
import { createOauthState } from '../lib/oauthState';

type KakaoLoginButtonProps = {
  /** 로그인 후 되돌아갈 앱 내부 경로. */
  redirectTo: string | null;
};

/**
 * 카카오 인가 화면으로 보내는 버튼.
 *
 * 색은 카카오 디자인 가이드가 지정한 값이라 의미 토큰으로 바꾸지 않는다.
 * 등락 색 규칙(컨벤션 §6)과는 다른 성격이다 — 저쪽은 우리가 의미를 정하지만
 * 이쪽은 카카오가 정한 브랜드 자산이다.
 */
export function KakaoLoginButton({ redirectTo }: KakaoLoginButtonProps) {
  const isConfigured = KAKAO_REST_API_KEY !== '';

  /**
   * `navigate` 가 아니라 `window.location.assign` 이다.
   * 카카오는 우리 앱의 라우트가 아니라 다른 오리진이라 라우터가 다룰 수 있는 대상이
   * 아니다. 여기서 SPA 를 완전히 떠나고, 돌아올 때는 콜백 경로로 새로 부팅된다.
   */
  const handleClick = () => {
    const state = createOauthState(redirectTo);
    window.location.assign(buildKakaoAuthorizeUrl(state));
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={!isConfigured}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 text-sm font-medium text-[#191600] disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.83 5.18 4.59 6.56l-1.16 4.26a.3.3 0 0 0 .46.33l5.11-3.38c.33.03.66.05.99.05 5.52 0 10-3.48 10-7.82S17.52 3 12 3Z" />
        </svg>
        카카오로 시작하기
      </button>
      {isConfigured ? null : (
        <p className="mt-2 text-center text-xs text-slate-500">
          카카오 REST API 키가 설정되지 않았습니다 (
          <code>VITE_KAKAO_REST_API_KEY</code>)
        </p>
      )}
    </div>
  );
}

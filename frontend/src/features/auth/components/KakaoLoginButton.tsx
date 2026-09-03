import { KAKAO_REST_API_KEY } from '@/shared/config/env';
import { Button } from '@/shared/ui/Button';

import { buildKakaoAuthorizeUrl } from '../lib/buildKakaoAuthorizeUrl';
import { createOauthState } from '../lib/oauthState';

type KakaoLoginButtonProps = {
  /** 로그인 후 되돌아갈 앱 내부 경로. */
  redirectTo: string | null;
};

export function KakaoLoginButton({ redirectTo }: KakaoLoginButtonProps) {
  const isConfigured = KAKAO_REST_API_KEY !== '';

  // navigate 가 아니라 location.assign 이다. 카카오는 우리 앱의 라우트가 아니라
  // 다른 오리진이라 라우터가 다룰 수 있는 대상이 아니다.
  const handleClick = () => {
    const state = createOauthState(redirectTo);
    window.location.assign(buildKakaoAuthorizeUrl(state));
  };

  return (
    <div>
      <Button variant="kakao" onClick={handleClick} disabled={!isConfigured}>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.83 5.18 4.59 6.56l-1.16 4.26a.3.3 0 0 0 .46.33l5.11-3.38c.33.03.66.05.99.05 5.52 0 10-3.48 10-7.82S17.52 3 12 3Z" />
        </svg>
        카카오로 시작하기
      </Button>
      {isConfigured ? null : (
        <p className="mt-2 text-center text-xs text-text-secondary">
          카카오 REST API 키가 설정되지 않았습니다 (
          <code>VITE_KAKAO_REST_API_KEY</code>)
        </p>
      )}
    </div>
  );
}

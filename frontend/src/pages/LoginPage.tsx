import { Navigate, useSearchParams } from 'react-router-dom';

import {
  KakaoLoginButton,
  toSafeRedirectPath,
  useAuthSession,
} from '@/features/auth';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 로그인 화면 (`/login`). 자체 회원가입 폼은 없다 — 인증 수단은 카카오 OAuth 하나이고
 * 최초 로그인이면 서버가 계정과 함께 가상 계좌·예수금을 만든다 (apiSpec §2.1).
 */
export function LoginPage() {
  const [searchParams] = useSearchParams();
  const status = useAuthSession((state) => state.status);
  const redirectTo = searchParams.get('redirect');

  // 이미 로그인한 사람에게 버튼을 보여 주지 않는다. 눌러도 카카오가 곧바로
  // 되돌려보내지만 그 사이 화면이 두 번 깜빡인다.
  // unknown 일 때는 판단하지 않는다. 아직 모르는 것이지 비로그인이 아니다.
  if (status === 'authenticated') {
    return <Navigate to={toSafeRedirectPath(redirectTo)} replace />;
  }

  return (
    <PageMain className="flex flex-col justify-center">
      <h1 className="text-2xl font-semibold text-fg-neutral">
        모의투자를 시작합니다
      </h1>
      <p className="mt-2 text-sm text-fg-neutral-subtle">
        카카오 계정으로 로그인하면 가상 계좌와 예수금이 준비됩니다
      </p>
      <div className="mt-8">
        <KakaoLoginButton redirectTo={redirectTo} />
      </div>
    </PageMain>
  );
}

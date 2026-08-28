import { useSearchParams } from 'react-router-dom';

import { KakaoLoginButton } from '@/features/auth';

/**
 * 로그인 화면 (`/login`).
 *
 * 자체 회원가입 폼은 없다. 인증 수단은 카카오 OAuth 하나이고, 최초 로그인이면
 * 서버가 계정과 함께 가상 계좌·1회차·예수금을 만든다 (apiSpec §2.1 · ia.md §1).
 *
 * URL 파라미터를 읽어 feature 에 넘기는 것이 페이지의 일이다 (컨벤션 §2).
 */
export function LoginPage() {
  const [searchParams] = useSearchParams();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <h1 className="text-2xl font-semibold text-slate-900">
        모의투자를 시작합니다
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        카카오 계정으로 로그인하면 가상 계좌와 예수금이 준비됩니다
      </p>
      <div className="mt-8">
        <KakaoLoginButton redirectTo={searchParams.get('redirect')} />
      </div>
    </main>
  );
}

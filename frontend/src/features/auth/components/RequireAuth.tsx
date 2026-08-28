import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Skeleton } from '@/shared/ui/Skeleton';

import { useAuthSession } from '../model/useAuthSession';

/**
 * 인증이 필요한 라우트를 감싸는 레이아웃 라우트. 보호할 화면은 children 으로 넣는다.
 * 화면마다 검사를 심으면 새 화면을 추가할 때 빠뜨리는 자리가 생기고, 빠뜨린 화면은
 * 아무 일도 안 일어난 것처럼 보여서 리뷰에서도 안 걸린다.
 */
export function RequireAuth() {
  const status = useAuthSession((state) => state.status);
  const location = useLocation();

  // unknown 을 unauthenticated 로 합치면 새로고침할 때마다 로그인 화면이 번쩍인다.
  if (status === 'unknown') {
    return (
      <main
        className="mx-auto w-full max-w-md px-4 py-6"
        aria-busy="true"
        aria-label="세션 확인 중"
      >
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-24 w-full" />
      </main>
    );
  }

  if (status === 'unauthenticated') {
    // 원래 가려던 곳을 들고 간다. 이 값은 카카오 왕복 동안 state 에 실려 살아남는다.
    const requestedPath = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(requestedPath)}`}
        replace
      />
    );
  }

  return <Outlet />;
}

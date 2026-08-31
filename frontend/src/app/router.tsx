import { createBrowserRouter, Navigate } from 'react-router-dom';

import { RequireAuth } from '@/features/auth';
import { HealthPage } from '@/pages/HealthPage';
import { KakaoCallbackPage } from '@/pages/KakaoCallbackPage';
import { LoginPage } from '@/pages/LoginPage';
import { MyPage } from '@/pages/MyPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/oauth/kakao', element: <KakaoCallbackPage /> },
  { path: '/health', element: <HealthPage /> },

  // 인증이 필요한 화면은 전부 이 아래에 넣는다 (ia.md §1).
  {
    element: <RequireAuth />,
    children: [{ path: '/my', element: <MyPage /> }],
  },

  // 홈(`/`)은 아직 없다. 로그인 성공 후 `/` 로 보내면 여기로 떨어진다.
  { path: '*', element: <Navigate to="/health" replace /> },
]);

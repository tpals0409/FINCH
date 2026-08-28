import { createBrowserRouter, Navigate } from 'react-router-dom';

import { HealthPage } from '@/pages/HealthPage';
import { KakaoCallbackPage } from '@/pages/KakaoCallbackPage';
import { LoginPage } from '@/pages/LoginPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/oauth/kakao', element: <KakaoCallbackPage /> },
  { path: '/health', element: <HealthPage /> },
  // 홈(`/`)은 아직 없다. 로그인 성공 후 `/` 로 보내면 여기로 떨어진다.
  { path: '*', element: <Navigate to="/health" replace /> },
]);

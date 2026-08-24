import { createBrowserRouter, Navigate } from 'react-router-dom';

import { HealthPage } from '@/pages/HealthPage';
import { StockDetailPage } from '@/pages/StockDetailPage';

/**
 * 라우팅 전면 설계는 별도 티켓(0-10)이다. 여기서는 종목 상세 경로 하나만 더한다.
 * 종목코드 경로 파라미터는 `:stockCode` 로 통일한다 — 백엔드 명세 전체가
 * `stockCode` 를 쓰고 AI 명세만 `ticker` 를 쓴다 (IA §2).
 */
export const router = createBrowserRouter([
  { path: '/health', element: <HealthPage /> },
  { path: '/stocks/:stockCode', element: <StockDetailPage /> },
  { path: '*', element: <Navigate to="/health" replace /> },
]);

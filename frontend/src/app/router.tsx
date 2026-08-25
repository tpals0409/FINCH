import { createBrowserRouter, Navigate } from 'react-router-dom';

import { HealthPage } from '@/pages/HealthPage';
/* DIRECTION:mono START (S15P21A101-95) */
import { MonoStockDetailPage } from '@/pages/MonoStockDetailPage';
/* DIRECTION:mono END */
import { StockDetailPage } from '@/pages/StockDetailPage';

/**
 * 라우팅 전면 설계는 별도 티켓(0-10)이다. 여기서는 종목 상세 경로 하나만 더한다.
 * 종목코드 경로 파라미터는 `:stockCode` 로 통일한다 — 백엔드 명세 전체가
 * `stockCode` 를 쓰고 AI 명세만 `ticker` 를 쓴다 (IA §2).
 */
export const router = createBrowserRouter([
  { path: '/health', element: <HealthPage /> },
  { path: '/stocks/:stockCode', element: <StockDetailPage /> },
  /* DIRECTION:mono START (S15P21A101-95)
     종목 상세의 세 번째 시안이다. 셋 중 하나만 살아남으므로 기존 경로를
     고치지 않고 하나 더 판다. 이 방향이 탈락하면 이 구간과 위 import 구간,
     그리고 `MonoStockDetailPage` 주석에 적힌 파일 목록을 지운다. */
  { path: '/mono/stocks/:stockCode', element: <MonoStockDetailPage /> },
  /* DIRECTION:mono END */
  { path: '*', element: <Navigate to="/health" replace /> },
]);

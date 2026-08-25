import { createBrowserRouter, Navigate } from 'react-router-dom';

/* DIRECTION:character START */
import { CharacterStockDetailPage } from '@/pages/CharacterStockDetailPage';
/* DIRECTION:character END */
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
  /* DIRECTION:character START
     캐릭터 방향 경쟁 시안(S15P21A101-93). 기존 경로는 애플 방향 그대로 두고
     여기에 줄만 더해, dev 서버 하나로 두 방향을 나란히 비교한다.
     방향이 정해지면 진 쪽의 페이지와 이 구간을 함께 지운다. */
  {
    path: '/character/stocks/:stockCode',
    element: <CharacterStockDetailPage />,
  },
  /* DIRECTION:character END */
  { path: '*', element: <Navigate to="/health" replace /> },
]);

import { createBrowserRouter, Navigate } from 'react-router-dom';

import { HealthPage } from '@/pages/HealthPage';

export const router = createBrowserRouter([
  { path: '/health', element: <HealthPage /> },
  { path: '*', element: <Navigate to="/health" replace /> },
]);

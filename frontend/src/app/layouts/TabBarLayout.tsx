import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { RouteFallback } from '../RouteFallback';

import { BottomTabBar } from './BottomTabBar';

/**
 * 하단 탭 바를 항상 달고 있는 상시 화면의 레이아웃 (ia.md §3).
 * 들어가는 화면은 홈 · 탐색 · 포트폴리오 · 내 정보 넷이다.
 * (2026-09-03 개정 전에는 4번째가 AI 채팅이었다. ia.md §3 을 본다.)
 *
 * 탭 바는 `BottomTabBar` 가 그리고 목록은 `BOTTOM_TAB_ROUTES` 가 갖는다.
 *
 * 탭 바가 `fixed` 라 본문 마지막 요소가 그 밑에 깔린다. 아래 래퍼에 탭 바 높이(56px)와
 * `env(safe-area-inset-bottom)` 만큼 하단 여백을 준다 — 이걸 빠뜨리면 마지막 버튼이
 * 탭 바에 가려 눌리지 않고, 그 증상이 화면마다 다르게 나타나 원인을 찾기 어렵다.
 *
 * Suspense 를 RootLayout 과 별개로 한 번 더 두는 이유 — 탭 바가 들어온 뒤
 * 탭을 옮길 때 바깥 경계가 잡으면 탭 바까지 폴백으로 사라져 화면이 깜빡인다.
 */
export function TabBarLayout() {
  return (
    <div className="min-h-dvh pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>

      <BottomTabBar />
    </div>
  );
}

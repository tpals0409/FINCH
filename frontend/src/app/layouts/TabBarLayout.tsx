import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { RouteFallback } from '../RouteFallback';

/**
 * 하단 탭 바를 항상 달고 있는 상시 화면의 레이아웃 (ia.md §3).
 * 들어가는 화면은 홈 · 탐색 · 포트폴리오 · AI 채팅 넷이다.
 *
 * **탭 바 컴포넌트는 여기서 만들지 않는다.**
 * 디자인 토큰과 공통 UI 는 티켓 S15P21A101-28 범위이고, 프로토타입이 정해진 뒤
 * 그쪽에서 만든다. 이 파일은 그때까지 자리만 잡아 둔다.
 *
 * 28 이 탭 바를 넣을 때 이 파일에서 할 일은 둘이다.
 * - 아래 주석 자리에 탭 바를 렌더한다. 목록은 `shared/config/routes.ts` 의
 *   `BOTTOM_TAB_ROUTES` 에 있다 (ia.md §3 의 4개 그대로).
 * - 탭 바가 `fixed` 로 뜨면 본문 마지막 요소가 그 밑에 깔린다.
 *   본문 래퍼에 탭 바 높이 + `env(safe-area-inset-bottom)` 만큼 하단 여백을 준다.
 *
 * Suspense 를 RootLayout 과 별개로 한 번 더 두는 이유 — 탭 바가 들어온 뒤
 * 탭을 옮길 때 바깥 경계가 잡으면 탭 바까지 폴백으로 사라져 화면이 깜빡인다.
 */
export function TabBarLayout() {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>

      {/* 여기에 티켓 S15P21A101-28 의 하단 탭 바가 들어온다. */}
    </div>
  );
}

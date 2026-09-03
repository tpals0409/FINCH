import { Suspense } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';

import { RouteFallback } from '../RouteFallback';

import { AiFloatingOverlay } from './AiFloatingOverlay';

/**
 * 모든 라우트의 바깥 레이아웃. 화면을 그리지 않고 두 가지만 한다.
 *
 * 1. **스크롤 복원.** `ScrollRestoration` 은 react-router 가 이미 주는 것이라
 *    라이브러리를 더하지 않는다. 이동할 때 맨 위로 올리고, 뒤로가기(POP)에서는
 *    직전 위치를 되돌린다. 목록에서 상세로 갔다 돌아왔을 때 보던 자리로 돌아오는
 *    동작이 여기서 나온다. **앱 전체에 하나만 둔다** — 여러 개 두면 서로 덮어쓴다.
 * 2. **lazy 청크의 Suspense 경계.** 여기 두면 어느 화면을 lazy 로 바꾸든
 *    각 화면이 자기 경계를 따로 만들지 않아도 된다.
 * 3. **전역 오버레이 레이어.** AI 플로팅 버튼이 들어갈 자리다 (ia.md §3).
 *    하단 탭이 있는 화면과 없는 화면 양쪽에 떠야 해서 `TabBarLayout` 안이 아니라
 *    여기 둔다. 어느 화면에서 보일지는 `AiFloatingOverlay` 가 혼자 판정한다 —
 *    배치가 아직 미확정이므로(ia.md §7) 고칠 자리를 한 곳으로 모아 둔 것이다.
 */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
      <AiFloatingOverlay />
    </>
  );
}

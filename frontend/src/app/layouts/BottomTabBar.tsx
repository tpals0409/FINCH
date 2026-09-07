import { NavLink } from 'react-router-dom';

import { BOTTOM_TAB_ROUTES } from '@/shared/config/routes';

/**
 * 하단 탭 바 (ia.md §3 · 와이어프레임 `explore-trade.dc.html`).
 *
 * 탭 목록은 `BOTTOM_TAB_ROUTES` 가 갖는다. 여기서 다시 적으면 라우트가 바뀔 때 두 곳이 갈린다.
 *
 * **아이콘이 없다.** 시안은 아이콘을 그렸지만 그 에셋이 저장소에 없다
 * (`public/icons.svg` 는 Vite 템플릿 기본값이고 우리 것이 아니다). 임의로 만들면 시안과
 * 어긋나고, 어긋난 것을 나중에 찾는 비용이 기다리는 비용보다 크다. 라벨만으로도 네 곳을
 * 오갈 수 있으므로 먼저 열고, 에셋이 오면 라벨 위에 얹는다.
 *
 * `end` 를 홈에만 주는 이유 — 홈 경로가 `/` 라서 `end` 가 없으면 모든 경로에서 활성이 된다.
 */
export function BottomTabBar() {
  return (
    <nav
      aria-label="주요 화면"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-stroke-neutral-subtle bg-bg-layer-default pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-14 w-full max-w-md">
        {BOTTOM_TAB_ROUTES.map((tab) => (
          <li key={tab.path} className="flex-1">
            <NavLink
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) =>
                `flex h-full items-center justify-center text-body-2 ${
                  isActive ? 'text-fg-neutral' : 'text-fg-neutral-subtle'
                }`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

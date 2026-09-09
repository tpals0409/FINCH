import { NavLink } from 'react-router-dom';

import { BOTTOM_TAB_ROUTES } from '@/shared/config/routes';

/**
 * 하단 탭 바 (ia.md §3 · 와이어프레임 `explore-trade.dc.html`).
 *
 * 탭 목록은 `BOTTOM_TAB_ROUTES` 가 갖는다. 여기서 다시 적으면 라우트가 바뀔 때 두 곳이 갈린다.
 *
 * `end` 를 홈에만 주는 이유 — 홈 경로가 `/` 라서 `end` 가 없으면 모든 경로에서 활성이 된다.
 */

function TabIcon({ path }: { path: string }) {
  const commonProps = {
    'aria-hidden': true,
    viewBox: '0 0 24 24',
    className: 'size-6 fill-none stroke-current',
    strokeWidth: 1.8,
  } as const;

  if (path === '/') {
    return (
      <svg {...commonProps}>
        <path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (path === '/search') {
    return (
      <svg {...commonProps}>
        <circle cx="10.8" cy="10.8" r="5.8" />
        <path d="m15.2 15.2 4.6 4.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (path === '/portfolio') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="6" width="16" height="13" rx="2" />
        <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1M4 11h16M10 11v2h4v-2" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

export function BottomTabBar() {
  return (
    <nav
      aria-label="주요 화면"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-stroke-neutral-subtle bg-bg-layer-default pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-16 w-full max-w-md">
        {BOTTOM_TAB_ROUTES.map((tab) => (
          <li key={tab.path} className="flex-1">
            <NavLink
              to={tab.path}
              viewTransition
              end={tab.path === '/'}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-0.5 text-caption ${
                  isActive ? 'text-fg-neutral' : 'text-fg-neutral-subtle'
                }`
              }
            >
              <TabIcon path={tab.path} />
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

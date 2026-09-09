import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { BOTTOM_TAB_ROUTES, ROUTES } from '@/shared/config/routes';

import { BackButton } from './BackButton';

type AppBarProps = {
  title: string;
  actions?: ReactNode;
  fallbackTo?: string;
};

/** 앱 화면의 공통 상단바. 탭 루트는 제목과 액션만, 하위 화면은 뒤로가기를 표시한다. */
export function AppBar({
  title,
  actions,
  fallbackTo = ROUTES.home,
}: AppBarProps) {
  const { pathname } = useLocation();
  const isTabRoot = BOTTOM_TAB_ROUTES.some((tab) => tab.path === pathname);

  return (
    <header className="sticky top-0 z-(--z-sticky) -mx-5 -mt-[calc(1.5rem+env(safe-area-inset-top))] mb-2 flex h-[calc(4rem+env(safe-area-inset-top))] shrink-0 items-center bg-bg-layer-default px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      {isTabRoot ? null : <BackButton fallbackTo={fallbackTo} />}
      <h1 className="min-w-0 flex-1 truncate text-title-2 text-fg-neutral">
        {title}
      </h1>
      {actions ? <div className="ml-2 shrink-0">{actions}</div> : null}
    </header>
  );
}

import { useLocation } from 'react-router-dom';

import { PageMain } from '@/shared/ui/PageMain';

type RoutePlaceholderProps = {
  /** ia.md §1 의 화면 이름. */
  screen: string;
};

/**
 * **아직 구현되지 않은 화면의 자리.** 화면이 아니라 골격의 표식이다.
 *
 * ia.md 의 화면 17개 중 담당 티켓이 아직 열리지 않았거나 진행 중인 것들이
 * 이것을 렌더한다. 라우트를 비워 두면 그 경로가 404 로 떨어져서 레이아웃·인증
 * 구조가 실제로 도는지 확인할 수 없다.
 *
 * **화면을 맡은 사람은 이 element 한 줄을 자기 페이지로 바꾸기만 하면 된다.**
 * 그것이 이 골격의 목적이다. 여기에 실제 UI 를 덧붙이지 않는다.
 */
export function RoutePlaceholder({ screen }: RoutePlaceholderProps) {
  const location = useLocation();

  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">{screen}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        아직 구현되지 않은 화면입니다. 라우트 자리만 잡혀 있습니다.
      </p>
      <p className="mt-4 text-xs text-text-muted">
        <code>{`${location.pathname}${location.search}`}</code>
      </p>
    </PageMain>
  );
}

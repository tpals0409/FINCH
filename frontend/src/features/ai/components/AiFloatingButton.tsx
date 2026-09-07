import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';

/**
 * AI 채팅으로 가는 플로팅 버튼 (ia.md §3).
 *
 * 노출 판정은 `AiFloatingOverlay` 가 하고 이 컴포넌트는 그리기만 한다.
 * 컨테이너가 `pointer-events-none` 이라 자기 것만 다시 켠다 — 빈 자리가 본문 터치를 막지
 * 않게 하려는 구조라 이 한 줄을 빠뜨리면 버튼이 눌리지 않는다.
 *
 * 하단 여백의 `3.5rem` 은 `BottomTabBar` 의 `h-14` 다. 탭이 없는 화면(종목 상세·브리핑)에서는
 * 그만큼 더 떠 있을 뿐이지만, 탭이 있는 화면에서 가려지는 것보다 낫다. 두 화면군을 갈라
 * 여백을 다르게 주면 판정이 두 곳(여기와 오버레이)으로 흩어진다.
 *
 * 면색은 브랜드 액센트가 아니라 잉크 채움이다 — `Button` 의 primary 와 같은 이유.
 */
export function AiFloatingButton() {
  return (
    <Link
      to={ROUTES.chat}
      aria-label="AI에게 묻기"
      className="pointer-events-auto mr-5 mb-[calc(3.5rem+1rem+env(safe-area-inset-bottom))] flex h-14 w-14 items-center justify-center rounded-full bg-bg-neutral-solid text-fg-neutral-inverted active:bg-bg-neutral-solid-pressed"
    >
      <span aria-hidden="true" className="text-label">
        AI
      </span>
    </Link>
  );
}

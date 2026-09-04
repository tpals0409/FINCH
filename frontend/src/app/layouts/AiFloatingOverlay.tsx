import { matchPath, useLocation } from 'react-router-dom';

import {
  ROUTES,
  ROUTE_PATTERNS,
  STOCK_CODE_PARAM,
} from '@/shared/config/routes';
import { StockCodeSchema } from '@/shared/types/primitives';

/**
 * **AI 플로팅 버튼이 보일 화면을 판정하는 자리.** 판정은 이 파일 한 곳에만 있다.
 *
 * ## 미확정이다 (ia.md §3 · §7)
 *
 * PRD v1.0 이 정한 배치는 **종목 상세 · 포트폴리오 · 브리핑 · 뉴스 상세**이고
 * 주문 화면은 제외한다(제출 버튼을 가린다). 그런데 프로토타입
 * (`finch-screens.dc.html`, Sprint 3 에서 삭제)의 구현은 `showFab: ["home","detail","portfolio","briefing"]`
 * 로 **홈이 들어가 있고 뉴스 상세가 없다.** 어느 쪽을 따를지 확정되지 않았고
 * ia.md §7 에 미확인 항목으로 올라가 있다 (AI 파트 · GitLab 이슈 #26 4번).
 *
 * 지금은 **ia.md §1·§2 가 그대로 옮겨 적은 PRD 문구를 따른다** — 종목 상세 ·
 * 포트폴리오 · 브리핑 전체 셋이다. 뉴스 상세는 대응하는 화면 자체가 없어서 빼고,
 * 홈은 PRD 배치에 없어서 넣지 않았다. **답이 오면 아래 배열 한 곳만 고친다.**
 *
 * 버튼이 넘기는 맥락의 범위(종목 코드만인지 탭·기간까지인지)와 채팅 요청의
 * `context.screen` 열거값도 같은 이슈로 물어 둔 상태다 (ia.md §2).
 */
const AI_FLOATING_PATTERNS: readonly string[] = [
  ROUTE_PATTERNS.stockDetail,
  ROUTES.portfolio,
  ROUTES.briefing,
];

/**
 * `matchPath` 는 기본이 완전 일치라 `/stocks/:stockCode` 패턴이
 * `/stocks/000660/order` 에는 걸리지 않는다. 주문 화면 제외가 이것으로 얻어진다.
 *
 * **경로가 맞아도 화면이 404 인 경우가 있다.** `/stocks/12` 는 패턴에는 걸리지만
 * `StockCodeGuard` 가 형식을 보고 404 를 렌더한다(컨벤션 §10 경로 파라미터).
 * 이 레이어는 가드 바깥에 있어서 그 판정을 물려받지 못하므로 같은 스키마로 한 번 더
 * 본다. 오버레이가 라우트 트리 최상단에 있는 대가다.
 */
function showsAiFloatingButton(pathname: string) {
  const match = AI_FLOATING_PATTERNS.reduce<ReturnType<
    typeof matchPath
  > | null>((found, pattern) => found ?? matchPath(pattern, pathname), null);

  if (match === null) {
    return false;
  }

  const stockCode = match.params[STOCK_CODE_PARAM];
  if (stockCode !== undefined) {
    return StockCodeSchema.safeParse(stockCode).success;
  }

  return true;
}

/**
 * 전역 오버레이 레이어. **`RootLayout` 이 `Outlet` 위에 항상 렌더한다.**
 *
 * 플로팅 버튼은 하단 탭이 있는 화면(포트폴리오)과 없는 화면(종목 상세·브리핑)에
 * 모두 떠야 하므로 `TabBarLayout` 안이 아니라 라우트 트리 최상단에 자리를 둔다.
 * `TabBarLayout` 안에 두면 탭 밖 화면에서 사라진다.
 *
 * **버튼 UI 는 여기서 그리지 않는다.** 공통 컴포넌트 티켓의 몫이고 이 파일은
 * 자리와 노출 판정만 갖는다. 버튼을 넣는 사람이 할 일은 둘이다.
 *
 * - 아래 주석 자리에 버튼을 렌더한다. 버튼 자신은 `pointer-events-auto` 를 켠다
 *   (이 컨테이너는 `pointer-events-none` 이라 빈 자리가 본문 터치를 막지 않는다)
 * - **탭 바에 가리지 않게 하단 여백을 잡는다.** 탭 바 컴포넌트가 아직 없어서
 *   높이 값이 정해지지 않았다. 탭 바가 `fixed` 로 들어오면 그 높이 +
 *   `env(safe-area-inset-bottom)` 만큼을 이 컨테이너 하단에 더한다. 탭이 없는
 *   화면(종목 상세·브리핑)에서는 safe-area 만 남는다 — 두 경우가 갈리므로
 *   여백 값도 `BOTTOM_TAB_ROUTES` 매칭으로 갈라야 한다.
 */
export function AiFloatingOverlay() {
  const location = useLocation();

  if (!showsAiFloatingButton(location.pathname)) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-(--z-floating) flex justify-end"
      data-testid="ai-floating-slot"
    >
      {/* 여기에 AI 플로팅 버튼이 들어온다. 공통 컴포넌트 티켓 범위다. */}
    </div>
  );
}

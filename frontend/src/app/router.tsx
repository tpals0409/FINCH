import { lazy, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { RequireAuth } from '@/features/auth';
import { KakaoCallbackPage } from '@/pages/KakaoCallbackPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ROUTES, ROUTE_PATTERNS } from '@/shared/config/routes';

import { RootLayout } from './layouts/RootLayout';
import { StockCodeGuard } from './layouts/StockCodeGuard';
import { TabBarLayout } from './layouts/TabBarLayout';
import { RoutePlaceholder } from './RoutePlaceholder';

/**
 * 라우트 트리. 화면 목록의 원본은 `frontend/docs/ia.md` §1·§2 다.
 * 경로 문자열은 여기 적지 않고 `shared/config/routes.ts` 에서 가져온다.
 *
 * ## 갈래는 셋이다 (ia.md §1·§3)
 *
 * | 갈래              | 화면                                                   |
 * | ----------------- | ------------------------------------------------------ |
 * | 비보호            | 로그인 · 카카오 콜백 · 404                             |
 * | 보호 + 하단 탭    | 홈 · 탐색 · 포트폴리오 · 내 정보 (ia.md §3 의 탭 4개)  |
 * | 보호 + 탭 없음    | 나머지 — 흐름 안으로 들어가는 화면                     |
 *
 * ia.md §1 이 "로그인 이후 화면은 전부 인증이 필요하다"로 못박았으므로 인증 2종과
 * 404 를 뺀 전부가 `RequireAuth` 아래다. §1 표의 `의존` 열에서 종목 검색·종목 상세만
 * `—` 인데, 그 열은 구현 선후 관계이지 인증 요구가 아니다.
 * (목 서버도 인증 경로 밖 전부에 Bearer 토큰을 요구한다.)
 *
 * **탭 바를 다는 화면은 ia.md §3 이 지목한 넷뿐이다.** 2026-09-03 개정으로 4번째
 * 자리가 `AI`(`/chat`) 에서 `내 정보`(`/my`) 로 바뀌었다 — AI 는 화면 맥락을 물고
 * 들어가는 플로팅 버튼으로 옮겨졌다(ia.md §3). `/chat` 은 라우트만 남아 탭 밖이다.
 * §3 이 관심 종목·최근 본 종목·매매 내역·충전·알림함·브리핑 전체를 "탭에 두지 않고
 * 홈·포트폴리오·탐색·내 정보 안에서 들어간다"로 적었다. 그 화면들이 탭 바를 **달고 있어야 하는지**는 ia.md 에 없다.
 * 여기서는 달지 않는 쪽을 기본값으로 골랐다 — 흐름 안으로 들어간 화면에서 탭을
 * 누르면 하던 일이 사라진다. 뒤집으려면 라우트를 `TabBarLayout` 아래로 옮기면 된다.
 *
 * ## 코드 스플리팅 기준
 *
 * **첫 요청으로 열리는 화면만 즉시 로드하고 나머지는 전부 `lazy` 다.**
 * 로그인·홈처럼 반드시 먼저 뜨는 화면을 lazy 로 열면 초기 로딩에 왕복이 하나 더 붙는다.
 * 반대로 안쪽 화면을 즉시 로드하면 로그인 화면 하나를 보려고 앱 전체를 받는다.
 *
 * 즉시 로드는 셋이다.
 * - `LoginPage` — 로그인하지 않은 사람이 가장 먼저 보는 화면이다
 * - `KakaoCallbackPage` — 카카오에서 돌아올 때 브라우저가 이 주소로 문서를 새로
 *   받는다. lazy 면 토큰 교환이 청크 왕복만큼 늦어진다
 * - `NotFoundPage` — 오류 화면을 보여 주려고 네트워크를 한 번 더 타지 않는다.
 *   `StockCodeGuard` 도 이것을 렌더하므로 어차피 초기 청크에 들어간다
 *
 * 나머지는 lazy 다. 화면을 추가하는 사람은 아래 `lazyPage` 를 쓰면 된다.
 */
function lazyPage<Key extends string>(
  loader: () => Promise<Record<Key, ComponentType>>,
  exportName: Key,
) {
  return lazy(async () => ({ default: (await loader())[exportName] }));
}

const HealthPage = lazyPage(() => import('@/pages/HealthPage'), 'HealthPage');
const MyPage = lazyPage(() => import('@/pages/MyPage'), 'MyPage');
const PortfolioPage = lazyPage(
  () => import('@/pages/PortfolioPage'),
  'PortfolioPage',
);
const TransactionsPage = lazyPage(
  () => import('@/pages/TransactionsPage'),
  'TransactionsPage',
);
const HomePage = lazyPage(() => import('@/pages/HomePage'), 'HomePage');
const RecentStocksPage = lazyPage(
  () => import('@/pages/RecentStocksPage'),
  'RecentStocksPage',
);
const StockSearchPage = lazyPage(
  () => import('@/pages/StockSearchPage'),
  'StockSearchPage',
);
const StockDetailPage = lazyPage(
  () => import('@/pages/StockDetailPage'),
  'StockDetailPage',
);
const DepositPage = lazyPage(
  () => import('@/pages/DepositPage'),
  'DepositPage',
);

export const router = createBrowserRouter([
  {
    // 스크롤 복원과 lazy 폴백을 한 곳에서 건다.
    element: <RootLayout />,
    children: [
      // ── 비보호 ────────────────────────────────────────────────────────
      { path: ROUTES.login, element: <LoginPage /> },
      { path: ROUTES.oauthKakao, element: <KakaoCallbackPage /> },
      // ia.md 밖의 개발 전용 배선 점검 화면. 화면 17개에 포함되지 않는다.
      { path: ROUTES.health, element: <HealthPage /> },

      {
        // 미인증이면 `/login?redirect=...` 으로 보낸다. 판정은 features/auth 의 것이고
        // 이 파일은 배치만 한다.
        element: <RequireAuth />,
        children: [
          {
            // 보호 + 하단 탭 (ia.md §3).
            element: <TabBarLayout />,
            children: [
              { path: ROUTES.home, element: <HomePage /> },
              {
                path: ROUTES.search,
                element: <StockSearchPage />,
              },
              {
                path: ROUTES.portfolio,
                element: <PortfolioPage />,
              },
              { path: ROUTES.my, element: <MyPage /> },
            ],
          },

          // ── 보호 + 탭 없음 ─────────────────────────────────────────────
          {
            path: ROUTES.recent,
            element: <RecentStocksPage />,
          },
          {
            path: ROUTES.transactions,
            element: <TransactionsPage />,
          },
          {
            // 경로 미확정. `ROUTES.briefing` 주석과 ia.md §7 을 본다.
            path: ROUTES.briefing,
            element: <RoutePlaceholder screen="브리핑 전체" />,
          },
          {
            path: ROUTES.deposit,
            element: <DepositPage />,
          },
          {
            // 경로 미확정. `ROUTES.inbox` 주석과 ia.md §7 을 본다.
            // 라우트는 `/inbox` 지만 프로토타입 내부 식별자는 `isMail`·`goMail` 이다.
            path: ROUTES.inbox,
            element: <RoutePlaceholder screen="알림함" />,
          },
          {
            path: ROUTES.chat,
            element: <RoutePlaceholder screen="AI 채팅" />,
          },
          {
            path: ROUTES.myWiki,
            element: <RoutePlaceholder screen="AI가 이해한 나" />,
          },

          {
            // 형식이 틀린 종목코드를 여기서 한 번에 거른다.
            element: <StockCodeGuard />,
            children: [
              {
                path: ROUTE_PATTERNS.stockDetail,
                element: <StockDetailPage />,
              },
              {
                path: ROUTE_PATTERNS.stockOrder,
                element: <RoutePlaceholder screen="주문" />,
              },
            ],
          },
        ],
      },

      // ── 404 ───────────────────────────────────────────────────────────
      { path: ROUTE_PATTERNS.notFound, element: <NotFoundPage /> },
    ],
  },
]);

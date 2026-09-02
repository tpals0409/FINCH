/**
 * 화면 경로 상수. 원본은 `frontend/docs/ia.md` §2 라우트 트리다.
 *
 * 경로 문자열을 화면 코드에 직접 적지 않는다. `apiContract.ts` 가 API 경로를 모아 둔 것과
 * 같은 이유다 — 흩어져 있으면 경로가 바뀔 때 고칠 자리를 찾는 것부터 일이 된다.
 * 파라미터가 붙는 경로는 `apiContract.ts` 의 `API_PATHS.stocks.detail` 과 같은 모양으로
 * 함수로 둔다. 오타 난 링크는 눌러 보기 전까지 드러나지 않는다.
 *
 * **`/stocks/:stockCode` 와 `?tab=ai` 는 프론트 혼자 정하는 값이 아니다** (ia.md §2).
 * 브리핑 응답의 `deeplink` 를 AI 서버가 이 경로 문자열로 만들어 내려보내므로
 * 바꾸면 브리핑 링크가 조용히 404 가 된다. 바꿔야 하면 AI 파트에 먼저 알린다.
 */

/** 종목코드 경로 파라미터 이름. `stockCode` 로 통일한다 (ia.md §2 · contracts C19). */
export const STOCK_CODE_PARAM = 'stockCode';

/**
 * 화면으로 이동할 때 쓰는 경로.
 * 링크·`navigate`·`redirect` 값은 전부 여기서 만든다.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  oauthKakao: '/oauth/kakao',
  search: '/search',
  recent: '/recent',
  stockDetail: (stockCode: string) => `/stocks/${stockCode}`,
  stockOrder: (stockCode: string) => `/stocks/${stockCode}/order`,
  portfolio: '/portfolio',
  transactions: '/transactions',
  rounds: '/rounds',
  deposit: '/deposit',
  watchlist: '/watchlist',
  chat: '/chat',
  my: '/my',
  myWiki: '/my/wiki',
  /** ia.md 에 없는 개발 전용 배선 점검 화면. 화면 17개에 포함되지 않는다. */
  health: '/health',
} as const;

/**
 * 라우터 정의에만 쓰는 패턴. **파라미터가 있는 것만 여기 둔다.**
 * 정적 경로는 `ROUTES` 의 값을 그대로 `path` 에 쓰면 되고, 두 벌로 적으면 어긋난다.
 * 패턴도 `ROUTES` 의 함수에 `:stockCode` 를 넣어 만든다. 원본은 한 곳이다.
 */
export const ROUTE_PATTERNS = {
  stockDetail: ROUTES.stockDetail(`:${STOCK_CODE_PARAM}`),
  stockOrder: ROUTES.stockOrder(`:${STOCK_CODE_PARAM}`),
  notFound: '*',
} as const;

/**
 * 하단 탭 바에 들어가는 4개 (ia.md §3).
 * 탭을 5개 이상 두면 44x44px 터치 영역 기준이 깨진다.
 * **탭 바 컴포넌트 자체는 티켓 S15P21A101-28 이 만든다.** 여기 있는 것은 목록뿐이다.
 */
export const BOTTOM_TAB_ROUTES = [
  { label: '홈', path: ROUTES.home },
  { label: '탐색', path: ROUTES.search },
  { label: '포트폴리오', path: ROUTES.portfolio },
  { label: 'AI', path: ROUTES.chat },
] as const;

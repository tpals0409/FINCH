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
/**
 * **`/rounds`(회차 조회)와 `/watchlist`(관심 종목 독립 화면)는 여기 없다.**
 * 회차 조회·계좌 초기화는 GitLab 이슈 #27 로 기능 자체가 빠졌고(ia.md §1 "기타"),
 * 관심 종목은 독립 화면을 갖지 않고 홈 안의 섹션으로만 존재한다(ia.md §1 "홈·자산").
 * **API 계약(`GET`·`POST`·`DELETE /watchlist`)은 그대로 살아 있다** — 화면만 없다.
 * 되살릴 일이 생기면 ia.md §2 를 먼저 고친다.
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
  /**
   * 브리핑 전체 화면. **경로 미확정** (ia.md §1·§7).
   * 프로토타입(`finch-screens.dc.html`)의 내부 화면 id `briefing` 을 따라 프론트가
   * 제안한 값이고 팀 확인을 받지 않았다. PRD v1.0 §06 의 화면 집계에는 독립 항목으로
   * 없다. 답이 오면 여기 한 줄만 고친다.
   */
  briefing: '/briefing',
  deposit: '/deposit',
  chat: '/chat',
  /**
   * 메일 — Finch 가 물어다 놓는 것 열람. **경로 미확정** (ia.md §1·§7).
   * 프로토타입의 화면 id(`isMail`·`goMail`)를 따라 프론트가 제안한 값이고 팀 확인을
   * 받지 않았다. **API 계약도 아직 없다** — GitLab 이슈 #26 1번으로 문의 중이다.
   */
  mail: '/mail',
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
 *
 * **2026-09-03 개정에서 4번째 자리가 `AI`(`/chat`) 에서 `내 정보`(`/my`) 로 바뀌었다.**
 * AI 는 보던 화면의 맥락을 물고 들어가는 플로팅 버튼으로 옮겨졌으므로 탭에 별도
 * 진입점을 둘 이유가 없다 (ia.md §3). `/chat` 라우트 자체는 남아 있고 탭 밖이다.
 */
export const BOTTOM_TAB_ROUTES = [
  { label: '홈', path: ROUTES.home },
  { label: '탐색', path: ROUTES.search },
  { label: '포트폴리오', path: ROUTES.portfolio },
  { label: '내 정보', path: ROUTES.my },
] as const;

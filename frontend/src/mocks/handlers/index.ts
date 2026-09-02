import { accountHandlers } from './account';
import { aiHandlers } from './ai';
import { authHandlers } from './auth';
import { healthHandlers } from './health';
import { recentHandlers } from './recent';
import { stockHandlers } from './stocks';
import { tradingHandlers } from './trading';
import { watchlistHandlers } from './watchlist';

/**
 * MSW 핸들러 모음. 이 디렉토리의 코드는 프로덕션 번들에 들어가면 안 되므로
 * app 진입점의 개발 전용 동적 import 로만 불러온다 (컨벤션 §2).
 *
 * **배열 순서가 곧 매칭 우선순위다.** `recentHandlers` 가 `stockHandlers` 보다 앞이어야
 * `/stocks/recent` 가 종목코드 `recent` 로 잡히지 않는다. `recentHandlers` 는 최근 본 종목과
 * 최근 검색어를 함께 담는다 (apiSpec §6.1·§6.2).
 *
 * ## 목이 없는 경로
 *
 * - AI 위키 3종(`GET /ai/wiki` · `PUT /ai/wiki/theses/{stockCode}` · `DELETE /ai/wiki/facts/{factId}`)
 *   — 중계 경로는 확정됐지만(contracts C80) `shared/config/apiContract.ts` 에 경로 상수부터 없다.
 *   위키를 쓰는 화면이 아직 없어 경로 상수와 목을 함께 만들 자리다
 * - 웹소켓(`/ws`)·STOMP, `/internal/v1/*` 2종 — 프론트 범위 밖
 *
 * **`API_PATHS` 에 있는 경로는 전부 목이 있다.**
 *
 * ## 공통 규칙
 *
 * - `POST /auth/kakao`·`POST /auth/refresh` 를 뺀 모든 경로가 `Authorization: Bearer` 를
 *   요구한다 (apiSpec §11.1). 헤더가 없으면 `AUTH_INVALID_TOKEN`, 만료 토큰이면
 *   `AUTH_TOKEN_EXPIRED` 다. 먼저 로그인 목을 태워야 다른 화면이 열린다.
 * - 에러 본문은 `{code, message, detail}` 이고 `isSuccess` 는 없다. `code` 문자열은
 *   `shared/types/errorCodes.ts` 상수에서만 온다.
 * - 도메인별 갈래 규칙은 각 파일 머리 주석의 표에 있다.
 */
export const handlers = [
  ...authHandlers,
  ...accountHandlers,
  ...recentHandlers,
  ...stockHandlers,
  ...watchlistHandlers,
  ...tradingHandlers,
  ...aiHandlers,
  ...healthHandlers,
];

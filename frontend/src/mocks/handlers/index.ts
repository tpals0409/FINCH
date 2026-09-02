import { accountHandlers } from './account';
import { authHandlers } from './auth';
import { healthHandlers } from './health';
import { stockHandlers } from './stocks';

/**
 * MSW 핸들러 모음. 이 디렉토리의 코드는 프로덕션 번들에 들어가면 안 되므로
 * app 진입점의 개발 전용 동적 import 로만 불러온다 (컨벤션 §2).
 *
 * **배열 순서가 곧 매칭 우선순위다.** `recentHandlers` 가 `stockHandlers` 보다 앞이어야
 * `/stocks/recent` 가 종목코드 `recent` 로 잡히지 않는다.
 *
 * ## 목이 없는 경로
 *
 * - `POST /ai/feedback` — 요청·응답 본문 미확정 (contracts P5, 이슈 #13)
 * - `GET·DELETE /stocks/search/recent` 3종 — 응답 본문이 명세에 없어 Zod 스키마도 없다
 * - 웹소켓(`/ws`)·STOMP, `/internal/v1/*` 2종 — 프론트 범위 밖
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
  ...stockHandlers,
  ...healthHandlers,
];

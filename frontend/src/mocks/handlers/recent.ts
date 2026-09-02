import { http, HttpResponse } from 'msw';

import { API_PATHS } from '@/shared/config/apiContract';

import { changeRateOf, findStock } from '../lib/catalog';
import { mockPath } from '../lib/http';
import { requireAuth } from '../lib/session';
import { store } from '../lib/store';

/**
 * 최근 본 종목 (apiSpec §6.1) · 최근 검색어 (apiSpec §6.2).
 *
 * 두 목록을 한 파일에 둔다. **§6 의 같은 절에 나란히 있고 화면에서도 나란히 놓이는
 * 대칭 계열이다** — 종목 검색 화면에서 검색어가 비어 있을 때의 초기 화면이 둘을 함께 그린다
 * (`docs/ia.md`). 등록 API 가 없고 조회 호출 자체가 기록이라는 구조도 같다.
 *
 * **상태 유지 범위** — 두 목록 모두 `lib/store.ts` 의 모듈 변수다. 새로고침하면
 * 초기 3건씩으로 돌아간다.
 *
 * | 무엇이 상태를 바꾸나 | 어디에 쌓이나 | 상한 |
 * | --- | --- | --- |
 * | `GET /stocks/{stockCode}` 호출 | 최근 본 종목 | 30건 FIFO (contracts C51) |
 * | `GET /stocks/search` 호출 | 최근 검색어 | 10건 FIFO (§6.2) |
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | `GET /stocks/recent` | `items` — 시세 3필드가 카탈로그 현재값으로 채워진다 |
 * | `GET /stocks/search/recent` | `items` — `keywordId`·`keyword`·`searchedAt` 뿐. **시세 필드가 없다** |
 * | 같은 검색어로 재검색 | 새 항목을 만들지 않고 `searchedAt` 만 갱신하고 최상단으로. `keywordId` 는 그대로 |
 * | 11번째 새 검색어 | 가장 오래된 항목이 밀려난다 |
 * | `DELETE` 4종 · 대상이 있음 | `204`, 목록에서 사라진다 |
 * | `DELETE` 4종 · **대상이 없음** | 똑같이 `204`. 404 가 아니다 |
 *
 * 삭제가 **대상이 없어도 `204`** 인 것은 apiSpec §11.2 의 멱등 규칙이다. 최근 검색어는
 * 여기에 이유가 하나 더 붙는다 — 남의 `keywordId` 를 지목한 경우도 "내 것 중에 없음" 과
 * 구분하지 않는다. 존재 여부를 알려주는 것 자체가 정보 노출이라서다(이슈 #23 3번 회신).
 * **목이 404 를 주면 화면이 존재하지 않는 분기를 그린다.**
 */

export const recentHandlers = [
  http.get(mockPath(API_PATHS.stocks.recent), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const items = store.recentStocks
      .map((entry) => {
        const stock = findStock(entry.stockCode);
        return stock === undefined
          ? null
          : {
              stockCode: stock.stockCode,
              stockName: stock.stockName,
              currentPrice: stock.currentPrice,
              changeRate: changeRateOf(stock),
              viewedAt: entry.viewedAt,
            };
      })
      .filter((item) => item !== null);

    return HttpResponse.json({ items });
  }),

  http.delete(
    mockPath(`${API_PATHS.stocks.recent}/:stockCode`),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const stockCode = String(params.stockCode);
      store.recentStocks = store.recentStocks.filter(
        (entry) => entry.stockCode !== stockCode,
      );

      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.delete(mockPath(API_PATHS.stocks.recent), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    store.recentStocks = [];
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(mockPath(API_PATHS.stocks.recentSearchKeywords), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    // 저장 순서가 곧 최신순이다 (`touchRecentSearchKeyword` 가 최상단에 붙인다).
    return HttpResponse.json({ items: store.recentSearchKeywords });
  }),

  http.delete(
    mockPath(`${API_PATHS.stocks.recentSearchKeywords}/:keywordId`),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      /*
       * 숫자로 안 읽히는 `keywordId` 도 `400` 이 아니라 `204` 다. 없는 대상과 구분하지
       * 않기로 한 계약(§6.2)을 여기서 어기면 화면이 검증 분기를 만들게 된다.
       */
      const keywordId = Number(params.keywordId);
      store.recentSearchKeywords = store.recentSearchKeywords.filter(
        (entry) => entry.keywordId !== keywordId,
      );

      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.delete(
    mockPath(API_PATHS.stocks.recentSearchKeywords),
    ({ request }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      store.recentSearchKeywords = [];
      return new HttpResponse(null, { status: 204 });
    },
  ),
];

import { http, HttpResponse } from 'msw';

import { API_PATHS } from '@/shared/config/apiContract';

import { changeRateOf, findStock } from '../lib/catalog';
import { mockPath } from '../lib/http';
import { requireAuth } from '../lib/session';
import { store } from '../lib/store';

/**
 * 최근 본 종목 (apiSpec §6.1).
 *
 * **상태 유지 범위** — 목록이 `lib/store.ts` 의 모듈 변수다. `GET /stocks/{stockCode}` 가
 * 항목을 추가하고 DELETE 두 종이 지운다. 새로고침하면 초기 3건으로 돌아간다.
 *
 * 삭제는 **대상이 없어도 `204`** 다 (apiSpec §11.2 — 멱등). 이미 지운 항목을 다시 지워도
 * 실패하지 않는다.
 *
 * ## 최근 검색어(§6.2) 3종은 만들지 않았다
 *
 * `GET /stocks/search/recent` 의 응답 본문이 명세에 정의돼 있지 않고
 * (`shared/types/stock.ts` 끝 주석 참고) 그래서 Zod 스키마도 없다.
 * `DELETE .../{keywordId}` 로 보아 항목에 식별자와 키워드가 있을 것 같지만 그것은 추측이라
 * 목으로 만들면 계약처럼 굳는다. 응답 본문이 정해지면 이 파일에 더한다.
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
];

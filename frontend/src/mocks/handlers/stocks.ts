import { http, HttpResponse } from 'msw';

import {
  API_PATHS,
  STOCK_PRICES_MAX_CODES,
  STOCK_SEARCH_MIN_KEYWORD_LENGTH,
} from '@/shared/config/apiContract';
import {
  COMMON_ERROR_CODES,
  STOCK_ERROR_CODES,
} from '@/shared/types/errorCodes';

import {
  findStock,
  MOCK_STOCKS,
  toStockQuote,
  toStockSummary,
} from '../lib/catalog';
import { errorResponse, mockPath, searchParam } from '../lib/http';
import { requireAuth } from '../lib/session';
import {
  findHolding,
  store,
  touchRecentSearchKeyword,
  touchRecentStock,
} from '../lib/store';
import { nowKstIso, toKstDateString } from '../lib/time';
import { profitRate } from '../lib/valuation';

/**
 * 종목 조회 · 검색 · 차트 · 시세 (apiSpec §5).
 *
 * **상태 유지 범위** — 종목 카탈로그는 고정이고 바뀌지 않는다. 상태를 건드리는 것은 둘이다.
 * `GET /stocks/{stockCode}` 호출이 최근 본 종목을, `GET /stocks/search` 호출이 최근 검색어를
 * 갱신한다. **둘 다 별도 등록 API 가 없어 조회 자체가 기록이다** (contracts C51 · apiSpec §6.2).
 * 두 목록의 목은 `handlers/recent.ts` 에 있다.
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | 카탈로그에 없는 종목코드 | `404 STOCK_NOT_FOUND` |
 * | `keyword` 2글자 미만 · `period` 열거값 밖 · `stockCodes` 누락이나 50건 초과 | `400 INVALID_REQUEST` |
 * | `036570`(엔씨소프트) | `suspended: true` — 뱃지와 주문 차단 렌더 |
 * | `010950`(에스오일) | `stale: true` + 마지막 수신 값 유지 |
 * | `900140`(엘브이엠씨홀딩스) | `stale: true` + 가격 3필드와 `asOf` 가 전부 `null` |
 *
 * 시세 없음은 에러가 아니다 (apiSpec §11.2) — 위 두 종목이 그 두 상태를 재현한다.
 */

const CANDLE_PERIODS = ['1M', '3M', '1Y'];

/** 기간별 캔들 개수. 셋 다 일봉이다 (apiSpec §5.3). */
const CANDLE_COUNTS: Record<string, number> = { '1M': 22, '3M': 66, '1Y': 248 };

/**
 * 결정적 의사난수. 같은 종목·같은 기간이면 항상 같은 차트가 나온다.
 * 새로고침할 때마다 캔들이 요동치면 차트 렌더 문제인지 데이터 문제인지 가릴 수 없다.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildCandles(stockCode: string, period: string, lastClose: number) {
  const count = CANDLE_COUNTS[period] ?? 22;
  const random = seededRandom(Number(stockCode) + count);

  // 마지막 캔들의 종가가 현재가와 맞도록 과거로 거슬러 올라가며 만든다.
  const closes: number[] = [lastClose];
  for (let index = 1; index < count; index += 1) {
    const previous = closes[0] ?? lastClose;
    const drift = (random() - 0.48) * 0.03;
    closes.unshift(Math.max(100, Math.round(previous * (1 - drift))));
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return closes.map((close, index) => {
    const open = Math.round(close * (1 + (random() - 0.5) * 0.012));
    const high = Math.max(open, close) + Math.round(close * random() * 0.008);
    const low = Math.min(open, close) - Math.round(close * random() * 0.008);
    // 주말을 건너뛰지 않는다. 목 차트의 목적은 렌더 확인이지 거래일 달력이 아니다.
    const date = new Date(Date.now() - (count - 1 - index) * dayMs);

    return {
      date: toKstDateString(date),
      open,
      high,
      low,
      close,
      volume: 1_000_000 + Math.round(random() * 20_000_000),
    };
  });
}

export const stockHandlers = [
  // 고정 경로가 `/stocks/{stockCode}` 보다 먼저 와야 한다. 순서가 뒤집히면
  // `/stocks/search` 가 종목코드 `search` 로 잡힌다.
  http.get(mockPath(API_PATHS.stocks.search), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const keyword = searchParam(request, 'keyword') ?? '';
    if (keyword.length < STOCK_SEARCH_MIN_KEYWORD_LENGTH) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '검색어를 두 글자 이상 입력해 주세요',
        400,
        { keyword: `${STOCK_SEARCH_MIN_KEYWORD_LENGTH}글자 이상이어야 합니다` },
      );
    }

    const sizeParam = searchParam(request, 'size');
    const size = sizeParam === null ? 10 : Number(sizeParam);
    if (!Number.isInteger(size) || size < 1 || size > 100) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { size: '1 이상 100 이하여야 합니다' },
      );
    }

    /*
     * **검색 성공이 최근 검색어에 기록을 남긴다** (apiSpec §6.2 — 등록 API 가 없다).
     * 결과가 0건이어도 기록한다 — 저장되는 것은 종목이 아니라 사용자가 입력한 문자열이다.
     * 검증 실패(`INVALID_REQUEST`)는 검색이 실행되지 않은 것이라 기록하지 않는다.
     */
    touchRecentSearchKeyword(keyword);

    const items = MOCK_STOCKS.filter(
      (stock) =>
        stock.stockName.includes(keyword) || stock.stockCode.includes(keyword),
    )
      .slice(0, size)
      .map(toStockSummary);

    return HttpResponse.json({ items });
  }),

  http.get(mockPath(API_PATHS.stocks.prices), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const raw = searchParam(request, 'stockCodes');
    const stockCodes =
      raw === null ? [] : raw.split(',').filter((code) => code !== '');

    if (stockCodes.length === 0 || stockCodes.length > STOCK_PRICES_MAX_CODES) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { stockCodes: `1건 이상 ${STOCK_PRICES_MAX_CODES}건 이하여야 합니다` },
      );
    }

    // 존재하지 않는 코드는 items 에서 빼고 전체를 실패시키지 않는다 (apiSpec §5.5).
    const items = stockCodes
      .map((stockCode) => findStock(stockCode))
      .filter((stock) => stock !== undefined)
      .map(toStockQuote);

    return HttpResponse.json({ items });
  }),

  http.get(
    mockPath(API_PATHS.stocks.candles(':stockCode')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const stockCode = String(params.stockCode);
      const stock = findStock(stockCode);
      if (stock === undefined) {
        return errorResponse(
          STOCK_ERROR_CODES.STOCK_NOT_FOUND,
          '종목을 찾을 수 없습니다',
          404,
        );
      }

      const period = searchParam(request, 'period') ?? '1M';
      if (!CANDLE_PERIODS.includes(period)) {
        return errorResponse(
          COMMON_ERROR_CODES.INVALID_REQUEST,
          '요청 값이 올바르지 않습니다',
          400,
          { period: '1M · 3M · 1Y 중 하나여야 합니다' },
        );
      }

      return HttpResponse.json({
        stockCode,
        period,
        interval: 'DAY',
        candles: buildCandles(stockCode, period, stock.currentPrice),
      });
    },
  ),

  http.get(
    mockPath(API_PATHS.stocks.price(':stockCode')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const stock = findStock(String(params.stockCode));
      if (stock === undefined) {
        return errorResponse(
          STOCK_ERROR_CODES.STOCK_NOT_FOUND,
          '종목을 찾을 수 없습니다',
          404,
        );
      }

      return HttpResponse.json(toStockQuote(stock));
    },
  ),

  http.get(
    mockPath(API_PATHS.stocks.detail(':stockCode')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const stockCode = String(params.stockCode);
      const stock = findStock(stockCode);
      if (stock === undefined) {
        return errorResponse(
          STOCK_ERROR_CODES.STOCK_NOT_FOUND,
          '종목을 찾을 수 없습니다',
          404,
        );
      }

      // 이 호출 자체가 최근 본 종목 기록이다 (contracts C51).
      touchRecentStock(stockCode);

      const holding = findHolding(stockCode);
      const evaluationProfit =
        holding === undefined
          ? 0
          : (stock.currentPrice - holding.avgBuyPrice) * holding.quantity;

      /*
       * **`quoteState` 를 상세에서도 존중한다** (apiSpec §5.2). 수신 이력이 없으면 시세 네 개가
       * `null` 이다. `previousClose` 는 종목 마스터의 값이라 그대로 실린다.
       *
       * `holding` 의 평가손익은 마지막으로 알던 가격으로 계속 낸다 — 보유 자체는 원장의
       * 사실이라 시세가 끊겼다고 사라지지 않는다.
       */
      const quoteMissing = stock.quoteState === 'missing';

      return HttpResponse.json({
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        market: stock.market,
        currentPrice: quoteMissing ? null : stock.currentPrice,
        previousClose: stock.previousClose,
        changeAmount: quoteMissing
          ? null
          : stock.currentPrice - stock.previousClose,
        changeRate: quoteMissing
          ? null
          : Math.round(
              ((stock.currentPrice - stock.previousClose) /
                stock.previousClose) *
                10000,
            ) / 100,
        suspended: stock.suspended,
        suspendedReason: stock.suspendedReason,
        watched: store.watchlist.some((entry) => entry.stockCode === stockCode),
        asOf: quoteMissing ? null : nowKstIso(),
        holding:
          holding === undefined
            ? null
            : {
                quantity: holding.quantity,
                avgBuyPrice: holding.avgBuyPrice,
                evaluationProfit,
                evaluationProfitRate: profitRate(
                  evaluationProfit,
                  holding.avgBuyPrice * holding.quantity,
                ),
              },
      });
    },
  ),
];

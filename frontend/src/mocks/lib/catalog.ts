import { ORDER_ERROR_CODES } from '@/shared/types/errorCodes';

import { nowKstIso } from './time';

/**
 * 목 종목 카탈로그. 시세·검색·주문·AI 가 모두 이 표 하나를 본다.
 * 여기 없는 종목코드는 전부 `STOCK_NOT_FOUND` 다.
 *
 * **등락이 세 방향 다 들어 있다** — 상승(적색)·하락(청색)·보합. 전부 상승으로 채우면
 * 하락 렌더를 아무도 보지 못한 채 시연에 들어간다.
 *
 * `changeRate` 는 **백분율**이다 (`-1.21` = −1.21%). 0~1 소수가 아니다 (contracts C18).
 * 금액·수량은 원 단위 정수다.
 */

/** 시세 상태 (apiSpec §5.4 `stale` 규칙 · contracts C42). */
export type MockQuoteState =
  /** 정상 수신 — 최신 값 + `stale: false` */
  | 'live'
  /** 수신 끊김 — 마지막 수신 값을 유지한 채 `stale: true` */
  | 'stale'
  /** 값 없음(캐시 미스) — 가격 3필드와 `asOf` 가 전부 `null` + `stale: true` */
  | 'missing';

export interface MockStock {
  stockCode: string;
  stockName: string;
  market: 'KOSPI' | 'KOSDAQ';
  /** AI 수익률 원인 분석의 섹터 축에 쓴다 */
  sector: string;
  previousClose: number;
  currentPrice: number;
  suspended: boolean;
  suspendedReason: string | null;
  quoteState: MockQuoteState;
  /**
   * `GET /orders/available` 이 `tradable: false` 로 답할 때의 `reason` 이고
   * `POST /orders` 가 그대로 거절 코드로 쓴다. `null` 이면 거래 가능하다.
   *
   * **목은 항상 장중으로 본다.** 시계로 판정하면 09:00~15:30 밖에서 주문 화면을
   * 아예 만들 수 없다. 대신 `ORDER_MARKET_CLOSED` 는 아래 전용 종목으로 재현한다.
   */
  orderRejection: string | null;
}

export const MOCK_STOCKS: readonly MockStock[] = [
  {
    stockCode: '005930',
    stockName: '삼성전자',
    market: 'KOSPI',
    sector: '반도체',
    previousClose: 74400,
    currentPrice: 73500,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    orderRejection: null,
  },
  {
    stockCode: '000660',
    stockName: 'SK하이닉스',
    market: 'KOSPI',
    sector: '반도체',
    previousClose: 191500,
    currentPrice: 198000,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    orderRejection: null,
  },
  {
    stockCode: '035720',
    stockName: '카카오',
    market: 'KOSPI',
    sector: '인터넷',
    previousClose: 41250,
    currentPrice: 41250,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    orderRejection: null,
  },
  {
    stockCode: '247540',
    stockName: '에코프로비엠',
    market: 'KOSDAQ',
    sector: '2차전지',
    previousClose: 146500,
    currentPrice: 158900,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    orderRejection: null,
  },
  {
    stockCode: '068270',
    stockName: '셀트리온',
    market: 'KOSPI',
    sector: '바이오',
    previousClose: 180000,
    currentPrice: 176300,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    orderRejection: null,
  },
  {
    stockCode: '036570',
    stockName: '엔씨소프트',
    market: 'KOSPI',
    sector: '게임',
    previousClose: 189000,
    currentPrice: 185000,
    suspended: true,
    suspendedReason: '조회공시 요구 (풍문 또는 보도)',
    quoteState: 'live',
    orderRejection: ORDER_ERROR_CODES.STOCK_SUSPENDED,
  },
  {
    stockCode: '010950',
    stockName: '에스오일',
    market: 'KOSPI',
    sector: '정유',
    previousClose: 62000,
    currentPrice: 63500,
    suspended: false,
    suspendedReason: null,
    quoteState: 'stale',
    orderRejection: ORDER_ERROR_CODES.MARKET_CLOSED,
  },
  {
    stockCode: '900140',
    stockName: '엘브이엠씨홀딩스',
    market: 'KOSDAQ',
    sector: '유통',
    previousClose: 2150,
    currentPrice: 2100,
    suspended: false,
    suspendedReason: null,
    quoteState: 'missing',
    orderRejection: ORDER_ERROR_CODES.PRICE_UNAVAILABLE,
  },
];

/** 카탈로그에서 종목을 찾는다. 없으면 `undefined` 다 → 호출부가 `STOCK_NOT_FOUND` 로 답한다. */
export function findStock(stockCode: string): MockStock | undefined {
  return MOCK_STOCKS.find((stock) => stock.stockCode === stockCode);
}

/** 전일 대비 변동액. 보합이면 0 이다. */
export function changeAmountOf(stock: MockStock): number {
  return stock.currentPrice - stock.previousClose;
}

/** 전일 대비 등락률. **백분율이고 소수점 둘째 자리까지다** (`-1.21`). */
export function changeRateOf(stock: MockStock): number {
  const rate = (changeAmountOf(stock) / stock.previousClose) * 100;
  return Math.round(rate * 100) / 100;
}

/** 목록 한 줄 (apiSpec §5.1 `StockSummary`). */
export function toStockSummary(stock: MockStock) {
  return {
    stockCode: stock.stockCode,
    stockName: stock.stockName,
    market: stock.market,
    currentPrice: stock.currentPrice,
    changeAmount: changeAmountOf(stock),
    changeRate: changeRateOf(stock),
    suspended: stock.suspended,
  };
}

/** 시세 한 건 (apiSpec §5.4). `quoteState` 가 세 상태를 가른다. */
export function toStockQuote(stock: MockStock) {
  if (stock.quoteState === 'missing') {
    return {
      stockCode: stock.stockCode,
      currentPrice: null,
      changeAmount: null,
      changeRate: null,
      asOf: null,
      stale: true,
    };
  }

  return {
    stockCode: stock.stockCode,
    currentPrice: stock.currentPrice,
    changeAmount: changeAmountOf(stock),
    changeRate: changeRateOf(stock),
    asOf: nowKstIso(),
    stale: stock.quoteState === 'stale',
  };
}

import {
  INITIAL_CASH_BALANCE,
  RECENT_STOCKS_MAX_COUNT,
} from '@/shared/config/apiContract';

import { nowKstIso } from './time';

/**
 * 목 서버의 가변 상태.
 *
 * **상태 유지 범위 — 모듈 변수다. 새로고침하면 아래 초기값으로 돌아간다.**
 * 주문·충전·관심 종목 추가·삭제·최근 본 종목은 한 세션 안에서만 이어진다.
 * 새로고침을 견뎌야 하는 것은 인증 쿠키 하나뿐이라(`lib/session.ts`) 나머지를
 * `localStorage` 로 빼지 않았다. 목 데이터가 브라우저에 눌어붙으면 초기 상태를
 * 다시 보려고 저장소를 뒤지게 된다.
 *
 * 금액·수량은 전부 원 단위 정수다.
 */

export interface MockHolding {
  stockCode: string;
  quantity: number;
  avgBuyPrice: number;
}

export interface MockRound {
  roundId: number;
  status: 'ACTIVE' | 'CLOSED';
  startedAt: string;
  closedAt: string | null;
  finalTotalAsset: number | null;
}

export interface MockTransaction {
  transactionId: number;
  type:
    'INITIAL_GRANT' | 'DEPOSIT' | 'BUY' | 'SELL' | 'ROUND_OPEN' | 'ROUND_CLOSE';
  occurredAt: string;
  stockCode: string | null;
  stockName: string | null;
  price: number | null;
  quantity: number | null;
  amount: number;
  realizedProfit: number | null;
  /** 백분율 */
  realizedProfitRate: number | null;
  paymentMethod: 'VIRTUAL_CARD' | 'VIRTUAL_TRANSFER' | null;
  /** 어느 회차의 원장인지. `GET /transactions` 의 `roundId` 필터에 쓴다 */
  roundId: number;
}

export interface MockWatchlistEntry {
  stockCode: string;
  registeredAt: string;
}

export interface MockRecentStock {
  stockCode: string;
  viewedAt: string;
}

interface MockStore {
  activeRoundId: number;
  rounds: MockRound[];
  cashBalance: number;
  /** 이번 회차 누적 충전액. 계좌 리셋 시 0 으로 돌아간다 (apiSpec §3.2) */
  roundDepositedAmount: number;
  holdings: MockHolding[];
  watchlist: MockWatchlistEntry[];
  recentStocks: MockRecentStock[];
  /** 최신순이다. `GET /transactions` 는 이 순서를 그대로 쓴다 */
  transactions: MockTransaction[];
  nextTransactionId: number;
  nextOrderId: number;
  nextDepositId: number;
}

export const store: MockStore = {
  activeRoundId: 3,
  rounds: [
    {
      roundId: 3,
      status: 'ACTIVE',
      startedAt: '2026-08-25T10:00:00+09:00',
      closedAt: null,
      finalTotalAsset: null,
    },
    {
      roundId: 2,
      status: 'CLOSED',
      startedAt: '2026-07-01T09:30:00+09:00',
      closedAt: '2026-08-25T10:00:00+09:00',
      finalTotalAsset: 1_842_500,
    },
    {
      roundId: 1,
      status: 'CLOSED',
      startedAt: '2026-06-02T09:10:00+09:00',
      closedAt: '2026-07-01T09:30:00+09:00',
      finalTotalAsset: 946_300,
    },
  ],
  cashBalance: 1_250_000,
  roundDepositedAmount: 3_000_000,
  holdings: [
    { stockCode: '005930', quantity: 10, avgBuyPrice: 71_200 },
    { stockCode: '000660', quantity: 3, avgBuyPrice: 180_000 },
    { stockCode: '035720', quantity: 20, avgBuyPrice: 45_000 },
  ],
  watchlist: [
    { stockCode: '005930', registeredAt: '2026-08-26T09:12:00+09:00' },
    { stockCode: '000660', registeredAt: '2026-08-27T10:41:00+09:00' },
    { stockCode: '247540', registeredAt: '2026-08-31T13:05:00+09:00' },
  ],
  recentStocks: [
    { stockCode: '000660', viewedAt: '2026-09-01T15:02:00+09:00' },
    { stockCode: '005930', viewedAt: '2026-09-01T14:48:00+09:00' },
    { stockCode: '068270', viewedAt: '2026-08-31T11:20:00+09:00' },
  ],
  transactions: [
    {
      transactionId: 305,
      type: 'SELL',
      occurredAt: '2026-09-01T13:22:10+09:00',
      stockCode: '068270',
      stockName: '셀트리온',
      price: 178_400,
      quantity: 2,
      amount: 356_800,
      realizedProfit: -11_600,
      realizedProfitRate: -3.15,
      paymentMethod: null,
      roundId: 3,
    },
    {
      transactionId: 304,
      type: 'BUY',
      occurredAt: '2026-08-31T10:04:41+09:00',
      stockCode: '035720',
      stockName: '카카오',
      price: 45_000,
      quantity: 20,
      amount: 900_000,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: null,
      roundId: 3,
    },
    {
      transactionId: 303,
      type: 'BUY',
      occurredAt: '2026-08-28T09:41:02+09:00',
      stockCode: '000660',
      stockName: 'SK하이닉스',
      price: 180_000,
      quantity: 3,
      amount: 540_000,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: null,
      roundId: 3,
    },
    {
      transactionId: 302,
      type: 'BUY',
      occurredAt: '2026-08-27T11:15:33+09:00',
      stockCode: '005930',
      stockName: '삼성전자',
      price: 71_200,
      quantity: 10,
      amount: 712_000,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: null,
      roundId: 3,
    },
    {
      transactionId: 301,
      type: 'DEPOSIT',
      occurredAt: '2026-08-26T14:31:02+09:00',
      stockCode: null,
      stockName: null,
      price: null,
      quantity: null,
      amount: 3_000_000,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: 'VIRTUAL_CARD',
      roundId: 3,
    },
    {
      transactionId: 300,
      type: 'INITIAL_GRANT',
      occurredAt: '2026-08-25T10:00:00+09:00',
      stockCode: null,
      stockName: null,
      price: null,
      quantity: null,
      amount: INITIAL_CASH_BALANCE,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: null,
      roundId: 3,
    },
    {
      transactionId: 299,
      type: 'ROUND_OPEN',
      occurredAt: '2026-08-25T10:00:00+09:00',
      stockCode: null,
      stockName: null,
      price: null,
      quantity: null,
      amount: 0,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: null,
      roundId: 3,
    },
  ],
  nextTransactionId: 306,
  nextOrderId: 101,
  nextDepositId: 56,
};

/** 보유 종목을 찾는다. 없으면 `undefined` 다. */
export function findHolding(stockCode: string): MockHolding | undefined {
  return store.holdings.find((holding) => holding.stockCode === stockCode);
}

/** 원장에 한 줄 남긴다. 목록 맨 앞(최신)에 붙는다. */
export function recordTransaction(
  entry: Omit<MockTransaction, 'transactionId' | 'roundId'>,
): MockTransaction {
  const transaction: MockTransaction = {
    ...entry,
    transactionId: store.nextTransactionId,
    roundId: store.activeRoundId,
  };
  store.nextTransactionId += 1;
  store.transactions.unshift(transaction);
  return transaction;
}

/**
 * 최근 본 종목을 갱신한다. `GET /stocks/{stockCode}` 호출 자체가 기록이다 (contracts C51).
 * 중복이면 최상단으로 올리고 최대 30건 FIFO 다.
 */
export function touchRecentStock(stockCode: string): void {
  store.recentStocks = [
    { stockCode, viewedAt: nowKstIso() },
    ...store.recentStocks.filter((entry) => entry.stockCode !== stockCode),
  ].slice(0, RECENT_STOCKS_MAX_COUNT);
}

/** 계좌 리셋 (apiSpec §3.2). 원장을 지우지 않고 회차를 갈아 끼운다. */
export function resetAccount(finalTotalAsset: number): {
  closedRoundId: number;
  closedStartedAt: string;
  newRoundId: number;
  at: string;
} {
  const at = nowKstIso();
  const closed = store.rounds.find(
    (round) => round.roundId === store.activeRoundId,
  );
  const closedStartedAt = closed?.startedAt ?? at;

  if (closed !== undefined) {
    closed.status = 'CLOSED';
    closed.closedAt = at;
    closed.finalTotalAsset = finalTotalAsset;
  }

  const closedRoundId = store.activeRoundId;
  const newRoundId = closedRoundId + 1;

  recordTransaction({
    type: 'ROUND_CLOSE',
    occurredAt: at,
    stockCode: null,
    stockName: null,
    price: null,
    quantity: null,
    amount: finalTotalAsset,
    realizedProfit: null,
    realizedProfitRate: null,
    paymentMethod: null,
  });

  store.activeRoundId = newRoundId;
  store.rounds.unshift({
    roundId: newRoundId,
    status: 'ACTIVE',
    startedAt: at,
    closedAt: null,
    finalTotalAsset: null,
  });
  store.cashBalance = INITIAL_CASH_BALANCE;
  store.roundDepositedAmount = 0;
  store.holdings = [];

  recordTransaction({
    type: 'ROUND_OPEN',
    occurredAt: at,
    stockCode: null,
    stockName: null,
    price: null,
    quantity: null,
    amount: 0,
    realizedProfit: null,
    realizedProfitRate: null,
    paymentMethod: null,
  });
  recordTransaction({
    type: 'INITIAL_GRANT',
    occurredAt: at,
    stockCode: null,
    stockName: null,
    price: null,
    quantity: null,
    amount: INITIAL_CASH_BALANCE,
    realizedProfit: null,
    realizedProfitRate: null,
    paymentMethod: null,
  });

  return { closedRoundId, closedStartedAt, newRoundId, at };
}

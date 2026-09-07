import type { OrderSide } from '@/shared/types/order';
import type { TransactionFilter } from '@/shared/types/portfolio';
import type { CandlePeriod, WatchlistSort } from '@/shared/types/stock';

/**
 * 쿼리 키 팩토리 (컨벤션 §4).
 * 호출부에서 문자열 배열을 직접 만들지 않는다. 직접 만들면 무효화 시점에
 * 키가 한 글자 어긋나 캐시가 안 지워지는 사고가 난다.
 */
export const queryKeys = {
  health: {
    all: () => ['health'] as const,
    status: () => [...queryKeys.health.all(), 'status'] as const,
  },
  users: {
    all: () => ['users'] as const,
    /** 키에 userId 를 넣지 않는다. 가리키는 대상은 언제나 지금 로그인한 사람이다. */
    me: () => [...queryKeys.users.all(), 'me'] as const,
  },
  account: {
    all: () => ['account'] as const,
    /** users.me 와 같은 이유로 식별자를 넣지 않는다. 계좌는 사용자당 하나다 (apiSpec 1.6). */
    summary: () => [...queryKeys.account.all(), 'summary'] as const,
  },
  deposits: {
    all: () => ['deposits'] as const,
    limit: () => [...queryKeys.deposits.all(), 'limit'] as const,
  },
  stocks: {
    all: () => ['stocks'] as const,
    /**
     * 검색어가 키에 들어간다. 글자를 지웠다 다시 치면 이전 결과가 캐시에서 즉시 뜬다 —
     * 그게 검색창에서 가장 흔한 동작이다.
     */
    search: (keyword: string) =>
      [...queryKeys.stocks.all(), 'search', keyword] as const,
    detail: (stockCode: string) =>
      [...queryKeys.stocks.all(), 'detail', stockCode] as const,
    candles: (stockCode: string, period: CandlePeriod) =>
      [...queryKeys.stocks.all(), 'candles', stockCode, period] as const,
    recent: () => [...queryKeys.stocks.all(), 'recent'] as const,
    /** 정렬이 키에 들어간다. 서버가 정렬을 하므로 탭을 바꾸면 다른 목록이다. */
    watchlist: (sort: WatchlistSort) =>
      [...queryKeys.stocks.all(), 'watchlist', sort] as const,
  },
  orders: {
    all: () => ['orders'] as const,
    /** `side` 가 키에 들어간다. 매수·매도는 maxQuantity 의 뜻이 달라 캐시를 나눈다. */
    available: (stockCode: string, side: OrderSide) =>
      [...queryKeys.orders.all(), 'available', stockCode, side] as const,
  },
  ai: {
    all: () => ['ai'] as const,
    /**
     * 날짜가 키에 들어간다. `null` 은 "당일" 이고 서버가 기준 거래일을 잡으므로
     * 날짜를 지정한 조회와 같은 캐시를 쓸 수 없다.
     */
    briefing: (date: string | null) =>
      [...queryKeys.ai.all(), 'briefing', date] as const,
    /** 위키는 사용자당 하나다. 식별자를 넣지 않는 이유는 users.me 와 같다. */
    wiki: () => [...queryKeys.ai.all(), 'wiki'] as const,
  },
  transactions: {
    all: () => ['transactions'] as const,
    /**
     * 필터가 키에 들어간다. 탭을 바꾸면 서버가 다른 목록을 주므로 같은 캐시를 쓸 수 없고,
     * 필터별로 나눠 두면 충전 후 `ALL`·`DEPOSIT` 만 무효화하고 매수·매도 탭은 건드리지 않는다.
     */
    list: (filter: TransactionFilter) =>
      [...queryKeys.transactions.all(), 'list', filter] as const,
  },
} as const;

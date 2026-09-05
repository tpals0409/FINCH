import type { TransactionFilter } from '@/shared/types/portfolio';
import type { CandlePeriod } from '@/shared/types/stock';

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

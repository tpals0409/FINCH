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
  stocks: {
    all: () => ['stocks'] as const,
    /** 종목코드는 6자리 문자열이다. 키에 숫자를 넣으면 `005930` 이 `5930` 이 된다. */
    detail: (stockCode: string) =>
      [...queryKeys.stocks.all(), 'detail', stockCode] as const,
    candles: (stockCode: string, period: string) =>
      [...queryKeys.stocks.all(), 'candles', stockCode, period] as const,
    analysis: (stockCode: string) =>
      [...queryKeys.stocks.all(), 'analysis', stockCode] as const,
  },
} as const;

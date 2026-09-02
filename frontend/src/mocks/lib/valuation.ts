import { findStock } from './catalog';
import { store } from './store';

/**
 * 평가금액·총자산 계산 (apiSpec §3.1 · §8.1 계산식).
 * 서버가 원장 기준으로 계산해 내려주는 값이라 화면은 표시만 한다. 목도 같은 식을 쓴다.
 *
 * 모두 원 단위 정수다. 나눗셈이 들어가는 수익률만 백분율이고 소수점 둘째 자리까지 반올림한다.
 */

/** 보유 종목의 현재가. 카탈로그에 없으면 평균 매수가로 대신한다. */
export function currentPriceOf(stockCode: string, fallback: number): number {
  return findStock(stockCode)?.currentPrice ?? fallback;
}

/** 평가금액 = Σ(보유 수량 × 현재가) */
export function evaluationAmount(): number {
  return store.holdings.reduce(
    (sum, holding) =>
      sum +
      holding.quantity * currentPriceOf(holding.stockCode, holding.avgBuyPrice),
    0,
  );
}

/** 총자산 = 예수금 + 평가금액 */
export function totalAsset(): number {
  return store.cashBalance + evaluationAmount();
}

/** 백분율 수익률. 분모가 0 이면 0 이다 (`3.23` = +3.23%). */
export function profitRate(profit: number, base: number): number {
  if (base === 0) {
    return 0;
  }
  return Math.round((profit / base) * 10000) / 100;
}

import type { Holding } from '@/shared/types/portfolio';

export type PortfolioSort =
  | 'profitRateDesc'
  | 'profitRateAsc'
  | 'evaluationDesc'
  | 'evaluationAsc'
  | 'nameAsc';

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: 1 | -1,
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return (right - left) * direction;
}

export function sortHoldings(holdings: Holding[], sort: PortfolioSort) {
  return [...holdings].sort((left, right) => {
    switch (sort) {
      case 'profitRateDesc':
        return compareNullableNumbers(
          left.evaluationProfitRate,
          right.evaluationProfitRate,
          1,
        );
      case 'profitRateAsc':
        return compareNullableNumbers(
          left.evaluationProfitRate,
          right.evaluationProfitRate,
          -1,
        );
      case 'evaluationDesc':
        return compareNullableNumbers(
          left.evaluationAmount,
          right.evaluationAmount,
          1,
        );
      case 'evaluationAsc':
        return compareNullableNumbers(
          left.evaluationAmount,
          right.evaluationAmount,
          -1,
        );
      case 'nameAsc':
        return left.stockName.localeCompare(right.stockName, 'ko');
    }
  });
}

import {
  formatKrw,
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import type { StockDetailResponse } from '@/shared/types/stock';

const DIRECTION_CLASS = {
  rise: 'text-fg-up',
  fall: 'text-fg-down',
  flat: 'text-fg-flat',
} as const;

/**
 * 상세 상단의 가격 블록 (apiSpec §5.2).
 *
 * 값이 없으면 "시세 없음" 이다 — 목록과 같은 규칙이고 이유도 같다(`StockPriceText`).
 * **전일 종가는 시세가 아니라 종목 마스터의 값이라 시세가 없어도 그대로 보인다.**
 * 그것마저 감추면 화면에 숫자가 하나도 안 남는다.
 */
export function StockDetailPrice({ stock }: { stock: StockDetailResponse }) {
  const { currentPrice, changeAmount, changeRate } = stock;
  const hasPrice =
    currentPrice !== null && changeAmount !== null && changeRate !== null;

  return (
    <div className="mt-4">
      {hasPrice ? (
        <>
          <p className="text-display text-fg-neutral tabular-nums">
            {formatKrw(currentPrice)}
          </p>
          <p
            className={`mt-1 text-body-1 tabular-nums ${DIRECTION_CLASS[getPriceDirection(changeRate)]}`}
          >
            {formatKrw(changeAmount)} ({formatSignedPercent(changeRate)})
          </p>
        </>
      ) : (
        <p className="text-title-2 text-fg-neutral-subtle">시세 없음</p>
      )}

      <p className="mt-2 text-body-2 text-fg-neutral-subtle tabular-nums">
        전일 종가 {formatKrw(stock.previousClose)}
      </p>
    </div>
  );
}

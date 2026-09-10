import { formatKstTime } from '@/shared/lib/formatDate';
import {
  formatKrw,
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import type { StockDetailResponse } from '@/shared/types/stock';
import { RollingValue } from '@/shared/ui/RollingValue';
import { SupportingText } from '@/shared/ui/SupportingText';

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
  const direction = changeRate === null ? null : getPriceDirection(changeRate);
  const directionClass = direction ? DIRECTION_CLASS[direction] : undefined;

  return (
    <div className="mt-4">
      {hasPrice ? (
        <>
          <p className="text-display text-fg-neutral tabular-nums">
            <RollingValue
              value={formatKrw(currentPrice)}
              numericValue={currentPrice}
              format={{ maximumFractionDigits: 0, useGrouping: true }}
              suffix="원"
              flashClasses={DIRECTION_CLASS}
            />
          </p>
          <p className={`mt-1 text-body-1 tabular-nums ${directionClass}`}>
            <RollingValue
              value={formatKrw(changeAmount)}
              numericValue={changeAmount}
              format={{ maximumFractionDigits: 0, useGrouping: true }}
              suffix="원"
            />{' '}
            (
            <RollingValue
              value={formatSignedPercent(changeRate)}
              numericValue={changeRate}
              format={{
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                signDisplay: 'exceptZero',
              }}
              suffix="%"
            />
            )
          </p>
        </>
      ) : (
        <p className="text-title-2 text-fg-neutral-subtle">시세 없음</p>
      )}

      <SupportingText className="mt-2 tabular-nums">
        전일 종가 {formatKrw(stock.previousClose)}
      </SupportingText>
      {stock.asOf ? (
        <SupportingText size="caption" className="mt-1 tabular-nums">
          {formatKstTime(stock.asOf)} 갱신
        </SupportingText>
      ) : null}
    </div>
  );
}

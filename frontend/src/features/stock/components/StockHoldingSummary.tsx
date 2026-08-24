import {
  formatCount,
  formatKrw,
  formatSignedChangeRate,
  formatSignedKrw,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { DataCell } from '@/shared/ui/DataCell';
import { DirectionMark } from '@/shared/ui/DirectionMark';
import { PlateSection } from '@/shared/ui/PlateSection';

import { useStockDetail } from '../api/useStockDetail';

type StockHoldingSummaryProps = {
  stockCode: string;
};

const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-rise-ink',
  fall: 'text-fall-ink',
  flat: 'text-flat',
};

/**
 * 내 보유 구획. 관찰 기록에 대응하는 자리다.
 *
 * 보유하지 않으면 이 구획을 아예 그리지 않는다. `0주`로 채우면 사용자가
 * 자기 기록이 있다고 착각한다 — 모르는 것을 아는 척하지 않는다는 원칙이
 * 빈 값에도 적용된다.
 */
export function StockHoldingSummary({ stockCode }: StockHoldingSummaryProps) {
  const { data } = useStockDetail(stockCode);
  const holding = data?.holding;

  if (holding === undefined || holding === null) {
    return null;
  }

  const direction = getPriceDirection(holding.evaluationProfitRate);

  return (
    <PlateSection label="내 보유">
      <dl className="grid grid-cols-2">
        <DataCell
          label="보유 수량"
          value={`${formatCount(holding.quantity)}주`}
        />
        <DataCell label="평균 단가" value={formatKrw(holding.avgBuyPrice)} />
        <DataCell
          label="평가손익"
          isWide
          value={
            <span
              className={`inline-flex items-center gap-1.5 ${DIRECTION_TEXT_CLASS[direction]}`}
            >
              <DirectionMark direction={direction} size={9} />
              {formatSignedKrw(holding.evaluationProfit)}
              <span className="text-rule-faint" aria-hidden="true">
                |
              </span>
              {formatSignedChangeRate(holding.evaluationProfitRate)}
            </span>
          }
        />
      </dl>
    </PlateSection>
  );
}

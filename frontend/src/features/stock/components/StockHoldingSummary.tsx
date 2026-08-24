import {
  formatCount,
  formatKrw,
  formatSignedChangeRate,
  formatSignedKrw,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { DirectionMark } from '@/shared/ui/DirectionMark';
import { SectionCard } from '@/shared/ui/SectionCard';
import { StatCell } from '@/shared/ui/StatCell';

import { useStockDetail } from '../api/useStockDetail';

type StockHoldingSummaryProps = {
  stockCode: string;
};

const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-rise',
  fall: 'text-fall',
  flat: 'text-flat',
};

/**
 * 내 보유 카드.
 *
 * 보유하지 않으면 이 카드를 아예 그리지 않는다. `0주`로 채우면 사용자가
 * 자기 기록이 있다고 착각한다 — 모르는 것을 아는 척하지 않는다는 원칙이
 * 빈 값에도 적용된다 (원칙 3).
 *
 * 평가손익은 한 줄을 다 쓴다. 사용자가 이 카드에서 실제로 찾는 값이 그거라서,
 * 수량·단가와 같은 칸 크기로 두면 셋 중 무엇을 봐야 하는지 고르게 된다.
 */
export function StockHoldingSummary({ stockCode }: StockHoldingSummaryProps) {
  const { data } = useStockDetail(stockCode);
  const holding = data?.holding;

  if (holding === undefined || holding === null) {
    return null;
  }

  const direction = getPriceDirection(holding.evaluationProfitRate);

  return (
    <SectionCard label="내 보유">
      <dl className="mt-2 grid grid-cols-2 gap-x-5 gap-y-4">
        <StatCell
          label="보유 수량"
          value={`${formatCount(holding.quantity)}주`}
        />
        <StatCell label="평균 단가" value={formatKrw(holding.avgBuyPrice)} />
      </dl>

      <div className="mt-4 border-t border-border pt-3.5">
        <p className="text-meta text-text-muted">평가손익</p>
        <p
          className={`mt-1 flex items-center gap-2.5 text-section font-semibold ${DIRECTION_TEXT_CLASS[direction]}`}
        >
          <DirectionMark direction={direction} size={10} />
          <span>{formatSignedKrw(holding.evaluationProfit)}</span>
          <span>{formatSignedChangeRate(holding.evaluationProfitRate)}</span>
        </p>
      </div>
    </SectionCard>
  );
}

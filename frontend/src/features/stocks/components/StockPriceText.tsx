import {
  formatKrw,
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import { hasSummaryPrice, type StockSummary } from '@/shared/types/stock';

const DIRECTION_CLASS = {
  rise: 'text-fg-up',
  fall: 'text-fg-down',
  flat: 'text-fg-flat',
} as const;

/**
 * 목록 한 줄의 가격 영역.
 *
 * **값이 없으면 "시세 없음" 이다. 스켈레톤이 아니다.** 시세 캐시에 수신 이력이 없는 것은
 * 로딩이 아니라 확정된 상태라(apiSpec §5.1 · §5.4 "값 없음"), 스피너를 띄우면 영원히 돈다.
 * 시세 수집이 붙기 전에는 전 종목이 이 상태다.
 *
 * 등락 색은 국내 관례다 — **상승 적색, 하락 청색.** 미국식과 반대다.
 */
export function StockPriceText({ stock }: { stock: StockSummary }) {
  if (!hasSummaryPrice(stock)) {
    return (
      <span className="text-body-2 text-fg-neutral-subtle">시세 없음</span>
    );
  }

  const direction = getPriceDirection(stock.changeRate);

  return (
    <span className="flex flex-col items-end">
      <span className="text-body-1 text-fg-neutral tabular-nums">
        {formatKrw(stock.currentPrice)}
      </span>
      <span
        className={`text-body-2 tabular-nums ${DIRECTION_CLASS[direction]}`}
      >
        {formatSignedPercent(stock.changeRate)}
      </span>
    </span>
  );
}

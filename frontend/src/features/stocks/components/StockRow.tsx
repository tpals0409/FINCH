import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import type { StockSummary } from '@/shared/types/stock';

import { StockPriceText } from './StockPriceText';

/**
 * 종목 한 줄. 검색 결과 · 최근 본 종목 · 관심 종목이 같은 모양을 쓴다.
 *
 * 줄 전체가 링크다. 이름만 링크로 만들면 모바일에서 눌러야 할 곳이 좁아진다.
 *
 * **거래정지 뱃지를 여기서 낸다** (contracts C46). 목록에서 안 보이면 상세로 들어가서야
 * 알게 되고, 그때는 이미 매수를 누르려던 참이다.
 */
export function StockRow({ stock }: { stock: StockSummary }) {
  return (
    <Link
      to={ROUTES.stockDetail(stock.stockCode)}
      className="flex items-center justify-between gap-3 rounded-card px-2 py-3 active:bg-bg-transparent-pressed"
    >
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-body-1 text-fg-neutral">
            {stock.stockName}
          </span>
          {stock.suspended ? (
            <span className="shrink-0 rounded-full border border-stroke-neutral-weak px-1.5 text-body-2 text-fg-neutral-subtle">
              거래정지
            </span>
          ) : null}
        </span>
        <span className="text-body-2 text-fg-neutral-subtle tabular-nums">
          {stock.stockCode} · {stock.market}
        </span>
      </span>

      <StockPriceText
        currentPrice={stock.currentPrice}
        changeRate={stock.changeRate}
      />
    </Link>
  );
}

import type { StockSummary } from '@/shared/types/stock';
import { Skeleton } from '@/shared/ui/Skeleton';

import { StockRow } from './StockRow';

type Props = {
  keyword: string;
  stocks: StockSummary[];
  isPending: boolean;
};

/**
 * 검색 결과 목록.
 *
 * **0건과 "아직 안 쳤다" 를 가른다.** 둘 다 빈 화면이지만 사용자가 할 일이 다르다 —
 * 0건이면 다른 검색어를 쳐야 하고, 안 쳤으면 그냥 치면 된다. 같은 문구를 쓰면
 * 검색이 고장 난 것처럼 보인다.
 */
export function StockSearchResults({ keyword, stocks, isPending }: Props) {
  if (isPending) {
    return (
      <ul className="mt-2">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="px-2 py-3">
            <Skeleton className="h-10 w-full" />
          </li>
        ))}
      </ul>
    );
  }

  if (stocks.length === 0) {
    return (
      <p className="mt-8 text-center text-body-2 text-fg-neutral-subtle">
        &lsquo;{keyword}&rsquo; 검색 결과가 없습니다
      </p>
    );
  }

  return (
    <ul className="mt-2">
      {stocks.map((stock) => (
        <li key={stock.stockCode}>
          <StockRow stock={stock} />
        </li>
      ))}
    </ul>
  );
}

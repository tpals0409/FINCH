import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useWatchlist } from '../api/useWatchlist';

import { StockPriceText } from './StockPriceText';

/**
 * 홈의 관심 종목 영역 (apiSpec §6.3 · ia.md §1).
 *
 * **독립 화면이 아니다.** 관심 종목은 홈 안의 영역으로만 존재하기로 정해졌다 — 그래서
 * "전체 보기" 로 갈 곳이 없고, 목록을 여기서 끝까지 그린다. 50개 상한이 서버에 있어
 * 무한히 길어지지 않는다.
 *
 * 실패해도 홈 전체를 죽이지 않는다. 자산 요약은 다른 요청이라 살아 있고, 관심 종목 하나
 * 때문에 총자산을 못 보는 편이 나쁘다.
 */
export function WatchlistSection() {
  const { data, isPending, isError } = useWatchlist();

  return (
    <section className="mt-6">
      <h2 className="text-title-3 text-fg-neutral">
        관심 종목
        {data ? (
          <span className="ml-1.5 text-body-2 text-fg-neutral-subtle tabular-nums">
            {data.count}/{data.maxCount}
          </span>
        ) : null}
      </h2>

      {isPending ? (
        <div className="mt-2 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <Card className="mt-2">
          <p className="text-body-2 text-fg-neutral-subtle">
            관심 종목을 불러오지 못했습니다
          </p>
        </Card>
      ) : data.items.length === 0 ? (
        <Card className="mt-2">
          <p className="text-body-2 text-fg-neutral-subtle">
            아직 담아 둔 종목이 없습니다
          </p>
          <Link
            to={ROUTES.search}
            className="mt-2 inline-block text-body-2 text-fg-neutral underline"
          >
            종목 찾아보기
          </Link>
        </Card>
      ) : (
        <ul className="mt-2">
          {data.items.map((item) => (
            <li key={item.stockCode}>
              <Link
                to={ROUTES.stockDetail(item.stockCode)}
                className="flex items-center justify-between gap-3 rounded-card px-2 py-3 active:bg-bg-transparent-pressed"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body-1 text-fg-neutral">
                    {item.stockName}
                  </span>
                  <span className="text-body-2 text-fg-neutral-subtle tabular-nums">
                    {item.stockCode}
                    {item.held ? ' · 보유' : ''}
                  </span>
                </span>
                <StockPriceText
                  currentPrice={item.currentPrice}
                  changeRate={item.changeRate}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

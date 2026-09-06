import { Link } from 'react-router-dom';

import {
  StockPriceText,
  useRecentStocks,
  useRemoveRecentStock,
} from '@/features/stocks';
import { ROUTES } from '@/shared/config/routes';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * 최근 본 종목 (apiSpec §6.1 · featureSpec §5).
 *
 * 개별 삭제 버튼을 줄 안에 두되 **링크 안에 넣지 않는다.** 중첩하면 지우려고 누른 것이
 * 상세로 들어가는 일이 생긴다.
 */
export function RecentStocksPage() {
  const { data, isPending, isError, refetch, isFetching } = useRecentStocks();
  const remove = useRemoveRecentStock();

  return (
    <PageMain>
      <div className="flex items-center justify-between">
        <h1 className="text-title-2 text-fg-neutral">최근 본 종목</h1>
        {data !== undefined && data.items.length > 0 ? (
          <button
            type="button"
            onClick={() => remove.mutate(undefined)}
            disabled={remove.isPending}
            className="text-body-2 text-fg-neutral-subtle underline disabled:text-fg-disabled"
          >
            전체 삭제
          </button>
        ) : null}
      </div>

      {isPending ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <Card className="mt-4">
          <p className="text-body-2 text-fg-neutral-subtle">
            불러오지 못했습니다
          </p>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 시도
          </Button>
        </Card>
      ) : data.items.length === 0 ? (
        <Card className="mt-4">
          <p className="text-body-2 text-fg-neutral-subtle">
            아직 본 종목이 없습니다
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
            <li key={item.stockCode} className="flex items-center gap-1">
              <Link
                to={ROUTES.stockDetail(item.stockCode)}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-card px-2 py-3 active:bg-bg-transparent-pressed"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body-1 text-fg-neutral">
                    {item.stockName}
                  </span>
                  <span className="text-body-2 text-fg-neutral-subtle tabular-nums">
                    {item.stockCode}
                  </span>
                </span>
                <StockPriceText
                  currentPrice={item.currentPrice}
                  changeRate={item.changeRate}
                />
              </Link>
              <button
                type="button"
                onClick={() => remove.mutate(item.stockCode)}
                disabled={remove.isPending}
                aria-label={`${item.stockName} 최근 본 목록에서 삭제`}
                className="shrink-0 rounded-card px-3 py-3 text-body-2 text-fg-neutral-subtle active:bg-bg-transparent-pressed disabled:text-fg-disabled"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </PageMain>
  );
}

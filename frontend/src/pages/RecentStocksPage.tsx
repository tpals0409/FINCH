import { Link } from 'react-router-dom';

import {
  StockPriceText,
  useRecentStocks,
  useRemoveRecentStock,
} from '@/features/stocks';
import { ROUTES } from '@/shared/config/routes';
import { AppBar } from '@/shared/ui/AppBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SupportingText } from '@/shared/ui/SupportingText';

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
      <AppBar
        title="최근 본 종목"
        actions={
          data !== undefined && data.items.length > 0 ? (
            <button
              type="button"
              onClick={() => remove.mutate(undefined)}
              disabled={remove.isPending}
              className="text-supporting underline disabled:text-fg-disabled"
            >
              전체 삭제
            </button>
          ) : null
        }
      />

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <Card>
          <SupportingText>최근 본 종목을 불러오지 못했어요</SupportingText>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 불러오기
          </Button>
        </Card>
      ) : data.items.length === 0 ? (
        <Card>
          <SupportingText>아직 본 종목이 없어요</SupportingText>
          <Link
            to={ROUTES.search}
            viewTransition
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
                viewTransition
                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-card px-2 py-3 active:bg-bg-transparent-pressed"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-body-1 text-fg-neutral">
                    {item.stockName}
                  </span>
                  <SupportingText as="span" className="tabular-nums">
                    {item.stockCode}
                  </SupportingText>
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
                className="text-supporting shrink-0 rounded-card px-3 py-3 active:bg-bg-transparent-pressed disabled:text-fg-disabled"
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

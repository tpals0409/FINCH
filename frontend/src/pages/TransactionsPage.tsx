import { useState } from 'react';

import {
  EmptyTransactions,
  TransactionFilterTabs,
  TransactionList,
  useTransactions,
} from '@/features/transactions';
import { useInfiniteScroll } from '@/shared/hooks/useInfiniteScroll';
import type { TransactionFilter } from '@/shared/types/portfolio';
import { AppBar } from '@/shared/ui/AppBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SupportingText } from '@/shared/ui/SupportingText';

/**
 * 매매 내역 (apiSpec §8.2 · featureSpec §8 · 와이어프레임 아트보드 10~14).
 *
 * 필터를 URL 이 아니라 로컬 상태로 둔다. `ROUTES.transactions` 에 쿼리 규약이 없고,
 * 프론트가 혼자 `?type=` 을 만들면 그것이 곧 계약이 된다 (ia.md §2).
 */
export function TransactionsPage() {
  const [filter, setFilter] = useState<TransactionFilter>('ALL');
  const {
    data,
    isPending,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTransactions(filter);

  const sentinelRef = useInfiniteScroll({
    enabled: hasNextPage && !isFetchingNextPage,
    onReach: () => void fetchNextPage(),
  });

  const transactions = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <PageMain>
      <AppBar title="매매 내역" />

      <div>
        <TransactionFilterTabs value={filter} onChange={setFilter} />
      </div>

      {isPending ? <ListSkeleton /> : null}

      {isError ? (
        <Card className="mt-4">
          <SupportingText>내역을 불러오지 못했어요</SupportingText>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 불러오기
          </Button>
        </Card>
      ) : null}

      {data !== undefined && transactions.length === 0 ? (
        <EmptyTransactions filter={filter} />
      ) : null}

      {transactions.length > 0 ? (
        <>
          <TransactionList transactions={transactions} />

          {/* 관찰 대상. 화면에 들어오면 다음 페이지를 부른다. */}
          <div ref={sentinelRef} aria-hidden="true" />

          {isFetchingNextPage ? <ListSkeleton /> : null}

          {!hasNextPage ? (
            <SupportingText size="caption" className="py-6 text-center">
              마지막 내역입니다
            </SupportingText>
          ) : null}
        </>
      ) : null}
    </PageMain>
  );
}

function ListSkeleton() {
  return (
    <div className="mt-4 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

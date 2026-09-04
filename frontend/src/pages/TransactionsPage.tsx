import { useEffect, useRef, useState } from 'react';

import {
  EmptyTransactions,
  TransactionFilterTabs,
  TransactionList,
  useTransactions,
} from '@/features/transactions';
import type { TransactionFilter } from '@/shared/types/portfolio';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';

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
      <h1 className="text-title-2 text-fg-neutral">매매 내역</h1>

      <div className="mt-4">
        <TransactionFilterTabs value={filter} onChange={setFilter} />
      </div>

      {isPending ? <ListSkeleton /> : null}

      {isError ? (
        <Card className="mt-4">
          <p className="text-body-2 text-fg-neutral-subtle">
            내역을 불러오지 못했습니다
          </p>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 시도
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
            <p className="py-6 text-center text-caption text-fg-neutral-subtle">
              마지막 내역입니다
            </p>
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

/**
 * 무한 스크롤. `IntersectionObserver` 는 플랫폼 기본 기능이라 라이브러리를 더하지 않는다.
 *
 * 스크롤 이벤트로 만들지 않는 이유 — 그쪽은 프레임마다 콜백이 돌아 스로틀을 직접 짜야 하고,
 * 그 스로틀이 빠른 스크롤에서 마지막 페이지를 놓친다.
 */
function useInfiniteScroll({
  enabled,
  onReach,
}: {
  enabled: boolean;
  onReach: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // 최신 콜백을 참조로 들고 있어 observer 를 매 렌더 다시 만들지 않는다.
  const onReachRef = useRef(onReach);
  // 렌더 중에 ref 를 쓰지 않는다 (react-hooks/refs). 커밋 뒤에 갱신해도
  // observer 콜백은 그 다음 교차에서 최신 값을 읽으므로 늦지 않는다.
  useEffect(() => {
    onReachRef.current = onReach;
  });

  useEffect(() => {
    const node = ref.current;
    if (!enabled || node === null) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onReachRef.current();
      }
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}

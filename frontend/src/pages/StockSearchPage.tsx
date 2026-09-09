import { useState } from 'react';

import {
  MIN_SEARCH_KEYWORD_LENGTH,
  StockSearchResults,
  useStockSearch,
} from '@/features/stocks';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useInfiniteScroll } from '@/shared/hooks/useInfiniteScroll';
import { AppBar } from '@/shared/ui/AppBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SupportingText } from '@/shared/ui/SupportingText';

/**
 * 종목 검색 (apiSpec §5.1 · featureSpec §4 · ia.md).
 *
 * 검색어를 URL 이 아니라 로컬 상태로 둔다. `ROUTES.search` 에 쿼리 규약이 없고, 프론트가
 * 혼자 `?q=` 를 만들면 그것이 곧 계약이 된다 (`TransactionsPage` 와 같은 이유, ia.md §2).
 *
 * **두 글자 미만은 요청을 보내지 않는다.** 서버가 `400 INVALID_REQUEST` 로 막는 선이라
 * (apiSpec §5.1) 보내고 무시하면 글자를 지우는 동안 에러 응답만 쌓인다.
 */
export function StockSearchPage() {
  const [keyword, setKeyword] = useState('');
  const debounced = useDebouncedValue(keyword);
  const trimmed = debounced.trim();
  const isReady = trimmed.length >= MIN_SEARCH_KEYWORD_LENGTH;

  const {
    data,
    isPending,
    isError,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStockSearch(debounced);
  const stocks = data?.pages.flatMap((page) => page.items) ?? [];
  const sentinelRef = useInfiniteScroll({
    enabled: isReady && hasNextPage && !isFetchingNextPage,
    onReach: () => void fetchNextPage(),
  });

  return (
    <PageMain>
      <AppBar title="종목 검색" />

      <input
        type="search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="종목명 또는 종목코드"
        aria-label="종목 검색"
        className="w-full rounded-card border border-stroke-neutral-weak bg-bg-layer-default px-4 py-3 text-body-1 text-fg-neutral placeholder:text-fg-placeholder"
      />

      {!isReady ? (
        <SupportingText className="mt-8 text-center">
          두 글자 이상 입력하면 검색할 수 있어요
        </SupportingText>
      ) : isError ? (
        <Card className="mt-4">
          <SupportingText>검색 결과를 불러오지 못했어요</SupportingText>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 불러오기
          </Button>
        </Card>
      ) : (
        <StockSearchResults
          keyword={trimmed}
          stocks={stocks}
          isPending={isPending}
        />
      )}

      {isReady && stocks.length > 0 ? (
        <>
          <div ref={sentinelRef} aria-hidden="true" />
          {isFetchingNextPage ? (
            <ul className="mt-2" aria-label="검색 결과 더 불러오는 중">
              <li className="px-2 py-3">
                <Skeleton className="h-10 w-full" />
              </li>
            </ul>
          ) : null}
        </>
      ) : null}
    </PageMain>
  );
}

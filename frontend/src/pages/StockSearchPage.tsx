import { useState } from 'react';

import {
  MIN_SEARCH_KEYWORD_LENGTH,
  StockSearchResults,
  useStockSearch,
} from '@/features/stocks';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';

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

  const { data, isPending, isError, refetch, isFetching } =
    useStockSearch(debounced);

  return (
    <PageMain>
      <h1 className="text-title-2 text-fg-neutral">종목 검색</h1>

      <input
        type="search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="종목명 또는 종목코드"
        aria-label="종목 검색"
        className="mt-4 w-full rounded-card border border-stroke-neutral-weak bg-bg-layer-default px-4 py-3 text-body-1 text-fg-neutral placeholder:text-fg-placeholder"
      />

      {!isReady ? (
        <p className="mt-8 text-center text-body-2 text-fg-neutral-subtle">
          두 글자 이상 입력해 주세요
        </p>
      ) : isError ? (
        <Card className="mt-4">
          <p className="text-body-2 text-fg-neutral-subtle">
            검색에 실패했습니다
          </p>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 시도
          </Button>
        </Card>
      ) : (
        <StockSearchResults
          keyword={trimmed}
          stocks={data?.items ?? []}
          isPending={isPending}
        />
      )}
    </PageMain>
  );
}

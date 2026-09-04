import { useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import type { TransactionFilter } from '@/shared/types/portfolio';

import { getTransactions } from './getTransactions';

/**
 * 매매 내역 무한 스크롤 (apiSpec §8.2 · §1.5).
 *
 * **종료 판정은 `hasNext` 다.** `items.length` 로 판정하지 않는다 — 마지막 페이지가 꽉 차는
 * 경우와 더 있는 경우를 길이로는 구분할 수 없고, 그 자리에서 마지막 한 페이지가 사라진다.
 *
 * `getNextPageParam` 이 `hasNext === false` 일 때 `undefined` 를 돌려주면 TanStack 이 더
 * 부르지 않는다. `nextCursor` 만 보고 판정하지 않는 이유도 같다 — 계약상 둘이 함께 오지만
 * 판정 근거는 `hasNext` 하나로 고정한다.
 */
export function useTransactions(filter: TransactionFilter) {
  return useInfiniteQuery({
    queryKey: queryKeys.transactions.list(filter),
    queryFn: ({ pageParam, signal }) =>
      getTransactions({ filter, cursor: pageParam, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
  });
}

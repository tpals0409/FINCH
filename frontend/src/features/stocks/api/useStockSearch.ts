import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getStockSearch } from './getStockSearch';

/** apiSpec §5.1 — "2글자 이상부터 호출한다". 서버도 같은 선을 400 으로 막는다. */
export const MIN_SEARCH_KEYWORD_LENGTH = 2;

/**
 * 종목 검색. 두 글자 미만이면 요청을 보내지 않는다.
 *
 * `enabled` 로 막는 이유는 서버가 그 경우 `400` 이기 때문이다. 보내고 400 을 받아 무시하면
 * 사용자가 글자를 지우는 동안 에러 응답이 계속 쌓이고, 콘솔과 서버 로그가 그것으로 찬다.
 *
 * `placeholderData` 로 이전 결과를 유지한다. 글자를 하나 더 칠 때마다 목록이 비었다가
 * 다시 차면 눈이 따라가지 못한다 — 새 결과가 올 때까지 옛 목록을 두는 편이 읽기 편하다.
 */
export function useStockSearch(keyword: string) {
  const trimmed = keyword.trim();

  return useQuery({
    queryKey: queryKeys.stocks.search(trimmed),
    queryFn: ({ signal }) => getStockSearch({ keyword: trimmed, signal }),
    enabled: trimmed.length >= MIN_SEARCH_KEYWORD_LENGTH,
    placeholderData: (previous) => previous,
  });
}

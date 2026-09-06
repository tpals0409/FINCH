import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { request, requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';
import { RecentStocksResponseSchema } from '@/shared/types/stock';

/**
 * 최근 본 종목 (apiSpec §6.1). 최대 30건 FIFO 이고 서버가 계정 기준으로 들고 있다.
 *
 * **등록 API 가 없다.** 종목 상세를 부르는 것이 곧 기록이다 (contracts C51) — 화면이 따로
 * 기록 요청을 보내면 같은 행이 두 번 쌓인다.
 */
export function useRecentStocks() {
  return useQuery({
    queryKey: queryKeys.stocks.recent(),
    queryFn: ({ signal }) =>
      request(API_PATHS.stocks.recent, {
        schema: RecentStocksResponseSchema,
        signal,
      }),
  });
}

/**
 * 한 건 지우기와 전체 지우기.
 *
 * **둘 다 `204` 를 본문 없이 준다.** `requestNoContent` 를 쓰는 이유는 `useToggleWatchlist`
 * 와 같다 — `request` 로 보내면 빈 본문에서 `response.json()` 이 터져 요청은 성공했는데
 * 화면이 실패로 본다.
 *
 * `stockCode` 를 주면 한 건, 안 주면 전체다. 훅을 둘로 나누지 않는 이유는 무효화 대상과
 * 실패 처리가 똑같아서다 — 나누면 같은 코드가 두 벌 생긴다.
 */
export function useRemoveRecentStock() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (stockCode?: string) =>
      requestNoContent(
        stockCode === undefined
          ? API_PATHS.stocks.recent
          : API_PATHS.stocks.recentItem(stockCode),
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stocks.recent(),
      });
    },
  });
}

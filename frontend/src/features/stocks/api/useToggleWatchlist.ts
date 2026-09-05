import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

type Params = {
  stockCode: string;
  /** 지금 담겨 있는지. 이 값의 반대로 요청이 갈린다. */
  watched: boolean;
};

/**
 * 관심 종목 담기·빼기 (apiSpec §6.3).
 *
 * **빼기는 없는 대상을 지워도 성공이다** (apiSpec §11.2 멱등 규칙). 그래서 화면이
 * "정말 담겨 있었는지" 를 다시 확인하지 않는다 — 두 번 눌러도 결과가 같다.
 *
 * 성공하면 상세를 무효화한다. `watched` 가 그 응답에 실려 있어(§5.2) 다시 읽어야
 * 토글이 서버 상태와 맞는다. 낙관적 갱신을 하지 않는 이유는 50개 한도가 서버에만 있어서다 —
 * 미리 켜 두면 한도 초과로 거절됐을 때 켜졌다 꺼지는 깜빡임이 생긴다.
 */
export function useToggleWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    /*
     * **담기도 `requestNoContent` 다.** 서버가 `201` 을 본문 없이 준다 — `request` 로 보내면
     * `response.json()` 이 빈 본문에서 터져 **요청은 성공했는데 화면은 실패로 본다**
     * (`requestNoContent` 주석이 경고하는 그 자리다).
     */
    mutationFn: ({ stockCode, watched }: Params) =>
      watched
        ? requestNoContent(API_PATHS.watchlist.remove(stockCode), {
            method: 'DELETE',
          })
        : requestNoContent(API_PATHS.watchlist.list, {
            method: 'POST',
            body: { stockCode },
          }),
    onSuccess: (_result, { stockCode }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stocks.detail(stockCode),
      });
      /*
       * 홈의 관심 종목 영역이 이 목록을 읽는다 (ia.md §1 — 독립 화면이 없다).
       * 빠뜨리면 상세에서 담고 홈으로 돌아왔을 때 목록에 없다.
       */
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.stocks.all(), 'watchlist'],
      });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { postDeposit } from './postDeposit';

/**
 * 충전 뮤테이션 (apiSpec §4.2).
 *
 * **`retry` 를 켜지 않는다.** TanStack 의 자동 재시도는 새 요청을 보내는 것이지 같은 키의
 * 재시도가 아니고, 네트워크가 끊긴 사이 서버가 이미 처리했을 수 있다. 재시도는 사용자가
 * 버튼으로 하고 그때 **같은 키**를 다시 쓴다 (`retry: false` 가 기본값이지만 명시한다 —
 * 돈이 움직이는 자리라 기본값에 기대지 않는다).
 *
 * 성공 시 계좌 요약·한도·내역을 무효화한다. 셋 다 이 요청으로 값이 바뀌고, 하나라도
 * 빠뜨리면 "충전했는데 잔고가 그대로" 가 된다.
 *
 * 매수·매도 목록은 건드리지 않는다 — 충전이 그 내역을 바꾸지 않는다.
 */
export function useCreateDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postDeposit,
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.account.summary(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.deposits.limit(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.list('ALL'),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.list('DEPOSIT'),
      });
    },
  });
}

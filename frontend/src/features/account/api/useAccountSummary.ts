import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getAccountSummary } from './getAccountSummary';

/**
 * 계좌 요약. 서버 상태라 스토어가 아니라 쿼리로 다룬다 (컨벤션 §4).
 *
 * `staleTime` 을 두지 않는다. 예수금은 충전·주문으로 바뀌고 그 화면들이 이 키를 무효화하는데,
 * staleTime 이 걸려 있으면 무효화 후에도 옛 잔액이 남아 "충전했는데 안 늘었다" 가 된다.
 * 돈이 보이는 숫자는 캐시로 아끼지 않는다.
 */
export function useAccountSummary() {
  return useQuery({
    queryKey: queryKeys.account.summary(),
    queryFn: ({ signal }) => getAccountSummary(signal),
  });
}

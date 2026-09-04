import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getDepositLimit } from './getDepositLimit';

/**
 * 충전 한도. `useAccountSummary` 와 같은 이유로 `staleTime` 을 두지 않는다 — 돈이 보이는
 * 숫자는 캐시로 아끼지 않는다.
 *
 * **여기서 받은 `remainingAmount` 로 누적 한도를 최종 판정하지 않는다.** 이 값을 받은 뒤
 * 다른 탭·세션에서 충전이 일어나면 낡는다. 판정은 서버가 하고 화면은 그 결과
 * (`DEPOSIT_LIMIT_EXCEEDED` 의 `detail.remainingAmount`)를 쓴다.
 */
export function useDepositLimit() {
  return useQuery({
    queryKey: queryKeys.deposits.limit(),
    queryFn: ({ signal }) => getDepositLimit(signal),
  });
}

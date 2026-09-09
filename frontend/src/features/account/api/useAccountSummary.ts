import { useQuery } from '@tanstack/react-query';

import {
  getQuotePollingOptions,
  type QuotePollingOverrides,
} from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { getAccountSummary } from './getAccountSummary';

/**
 * 계좌 요약. 서버 상태라 스토어가 아니라 쿼리로 다룬다 (컨벤션 §4).
 *
 * 평가금액과 총자산은 시세를 포함하므로 목록 권장 주기로 다시 받는다. 충전·주문 성공 시에는
 * 이 키를 명시적으로 무효화하므로 `staleTime` 안이어도 즉시 다시 가져온다.
 */
export function useAccountSummary(polling?: QuotePollingOverrides) {
  return useQuery({
    queryKey: queryKeys.account.summary(),
    queryFn: ({ signal }) => getAccountSummary(signal),
    ...getQuotePollingOptions('list', polling),
  });
}

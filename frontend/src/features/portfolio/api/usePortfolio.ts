import { useQuery } from '@tanstack/react-query';

import {
  getQuotePollingOptions,
  type QuotePollingOverrides,
} from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { getPortfolio } from './getPortfolio';

export function usePortfolio(polling?: QuotePollingOverrides) {
  return useQuery({
    queryKey: queryKeys.portfolio.summary(),
    queryFn: ({ signal }) => getPortfolio(signal),
    ...getQuotePollingOptions('list', polling),
  });
}

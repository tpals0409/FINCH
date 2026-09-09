import { useQuery } from '@tanstack/react-query';

import {
  getQuotePollingOptions,
  type QuotePollingOverrides,
} from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';
import type { WatchlistSort } from '@/shared/types/stock';

import { getWatchlist } from './getWatchlist';

export function useWatchlist(
  sort: WatchlistSort = 'REGISTERED',
  polling?: QuotePollingOverrides,
) {
  return useQuery({
    queryKey: queryKeys.stocks.watchlist(sort),
    queryFn: ({ signal }) => getWatchlist(sort, signal),
    ...getQuotePollingOptions('list', polling),
  });
}

import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  WatchlistResponseSchema,
  type WatchlistResponse,
  type WatchlistSort,
} from '@/shared/types/stock';

/**
 * 관심 종목 목록 (apiSpec §6.3).
 *
 * **독립 화면이 없다.** 홈 안의 영역으로만 존재한다 (ia.md §1). API 는 그대로 살아 있다.
 */
export function getWatchlist(
  sort: WatchlistSort,
  signal?: AbortSignal,
): Promise<WatchlistResponse> {
  const query = new URLSearchParams({ sort });

  return request(`${API_PATHS.watchlist.list}?${query.toString()}`, {
    schema: WatchlistResponseSchema,
    signal,
  });
}

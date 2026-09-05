import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  StockSearchResponseSchema,
  type StockSearchResponse,
} from '@/shared/types/stock';

type Params = {
  keyword: string;
  signal?: AbortSignal;
};

/**
 * 종목 검색 (apiSpec §5.1).
 *
 * `size` 를 보내지 않는다. 서버 기본값 10 이 자동완성 목록의 적정 길이고, 화면이 임의로
 * 늘리면 그 숫자가 두 곳에 살게 된다 (`getTransactions` 와 같은 이유).
 *
 * **두 글자 미만은 여기까지 오면 안 된다.** 서버가 `400 INVALID_REQUEST` 로 막는다 —
 * 호출 전에 거르는 책임은 `useStockSearch` 의 `enabled` 에 있다.
 */
export function getStockSearch({
  keyword,
  signal,
}: Params): Promise<StockSearchResponse> {
  const query = new URLSearchParams({ keyword });

  return request(`${API_PATHS.stocks.search}?${query.toString()}`, {
    schema: StockSearchResponseSchema,
    signal,
  });
}

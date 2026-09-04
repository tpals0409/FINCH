import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  TransactionsResponseSchema,
  type TransactionFilter,
  type TransactionsResponse,
} from '@/shared/types/portfolio';

type Params = {
  filter: TransactionFilter;
  /**
   * 이전 응답의 `nextCursor` 를 **그대로** 넘긴다. 커서는 불투명 문자열이라
   * 파싱·조작·해석하지 않는다 (apiSpec §1.5). 인코딩 방식은 서버 구현 상세다.
   */
  cursor?: string | null;
  signal?: AbortSignal;
};

/**
 * 매매 내역 조회 (apiSpec §8.2). 원장 기반 통합 내역이라 충전도 함께 나온다.
 *
 * `size` 를 보내지 않는다. 서버 기본값 30 이 화면 기본값이고, 화면이 임의로 늘리면
 * 그 숫자가 프론트와 서버 두 곳에 살게 된다.
 */
export function getTransactions({
  filter,
  cursor,
  signal,
}: Params): Promise<TransactionsResponse> {
  const query = new URLSearchParams({ type: filter });
  if (cursor !== undefined && cursor !== null && cursor !== '') {
    query.set('cursor', cursor);
  }

  return request(`${API_PATHS.transactions}?${query.toString()}`, {
    schema: TransactionsResponseSchema,
    signal,
  });
}

import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  StockDetailResponseSchema,
  type StockDetailResponse,
} from '@/shared/types/stock';

/**
 * 종목 상세 (apiSpec §5.2).
 *
 * **이 호출 자체가 최근 본 종목 기록이다.** 별도 등록 API 가 없다 (contracts C51) —
 * 화면이 따로 기록 요청을 보내면 같은 행이 두 번 쌓인다.
 */
export function getStockDetail(
  stockCode: string,
  signal?: AbortSignal,
): Promise<StockDetailResponse> {
  return request(API_PATHS.stocks.detail(stockCode), {
    schema: StockDetailResponseSchema,
    signal,
  });
}

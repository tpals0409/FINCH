import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  OrderAvailableResponseSchema,
  type OrderAvailableResponse,
  type OrderSide,
} from '@/shared/types/order';

/**
 * 주문 가능 정보 (apiSpec §7.3).
 *
 * **`tradable: false` 도 `200` 이다.** 화면은 `reason` 으로 버튼을 잠근다 — 에러로 오면
 * 주문 화면 자체가 에러 상태가 되어 왜 못 사는지 보여줄 자리가 사라진다.
 */
export function getOrderAvailable(
  stockCode: string,
  side: OrderSide,
  signal?: AbortSignal,
): Promise<OrderAvailableResponse> {
  const query = new URLSearchParams({ stockCode, side });

  return request(`${API_PATHS.orders.available}?${query.toString()}`, {
    schema: OrderAvailableResponseSchema,
    signal,
  });
}

// DIRECTION: mono (S15P21A101-95)

import { useStockDetail } from '../../api/useStockDetail';
import type { StockDetail } from '../../model/stockDetail';
import {
  applyMonoMockOverride,
  type MonoMockOverride,
} from '../model/monoMock';

type MonoStockDetailQuery = {
  data: StockDetail | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
};

/**
 * 92 의 시세 훅을 그대로 쓰고 결과만 다시 계산한다.
 *
 * 데이터 계층(스키마·훅·목)은 92 것을 공유한다. 시안이 갈라지는 것은 화면이지
 * 데이터가 아니다. 세 상태를 눈으로 보기 위한 강제만 여기서 얹는다.
 *
 * 쿼리 결과를 통째로 펴서 돌려주지 않는다. TanStack Query v5 가 돌려주는 객체는
 * 어느 필드를 실제로 읽었는지 추적해 재렌더를 줄이는데, 펴는 순간 전부 읽은 것이
 * 되어 그 최적화가 꺼진다. 이 화면이 쓰는 다섯 가지만 골라 담는다.
 */
export function useMonoStockDetail(
  stockCode: string,
  override: MonoMockOverride,
): MonoStockDetailQuery {
  const query = useStockDetail(stockCode);

  return {
    data:
      query.data === undefined
        ? undefined
        : applyMonoMockOverride(query.data, override),
    isPending: query.isPending,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: () => {
      void query.refetch();
    },
  };
}

// DIRECTION: mono (S15P21A101-95)

/**
 * 모노 방향의 경계. 밖에서는 이 파일에 있는 것만 쓴다.
 *
 * 92 의 `features/stock/index.ts` 를 고치지 않고 따로 둔다. 시안 셋 중 둘은
 * 지워지므로, 한쪽 barrel 에 다른 쪽 export 를 섞으면 지울 때 함께 죽는다.
 */
export { StockDetailView } from './StockDetailView';
export {
  MOCK_PRICE_STATES,
  type MockPriceState,
  type MonoMockOverride,
} from './model/monoMock';

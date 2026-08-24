/** feature 경계의 barrel. 밖에서는 이 파일에 있는 것만 쓴다 (컨벤션 §3). */
export { StockDetailView } from './components/StockDetailView';
export {
  CANDLE_PERIODS,
  CandlePeriodSchema,
  STOCK_DETAIL_TABS,
  StockDetailTabSchema,
  type CandlePeriod,
  type StockDetailTab,
} from './model/stockDetail';
export type { MockAnalysisOutcome } from './api/getStockDetail';

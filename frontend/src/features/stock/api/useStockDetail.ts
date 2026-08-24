import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import type { CandlePeriod } from '../model/stockDetail';

import {
  getStockAnalysis,
  getStockCandles,
  getStockDetail,
  getStockProfile,
  type MockAnalysisOutcome,
} from './getStockDetail';

/**
 * 종목 상세의 서버 상태 훅.
 *
 * `staleTime` 은 데이터 성격에 맞춘다 (컨벤션 §4).
 * 시세는 계속 바뀌므로 0 에 가깝게, 일봉과 기업 지표는 장중에 거의 안 바뀌므로 길게,
 * AI 응답은 느리고 비싸므로 가장 길게 잡는다.
 */

const QUOTE_STALE_TIME_MS = 3_000;
const CANDLE_STALE_TIME_MS = 5 * 60 * 1_000;
const PROFILE_STALE_TIME_MS = 30 * 60 * 1_000;
const ANALYSIS_STALE_TIME_MS = 10 * 60 * 1_000;

export function useStockDetail(stockCode: string) {
  return useQuery({
    queryKey: queryKeys.stocks.detail(stockCode),
    queryFn: () => getStockDetail(stockCode),
    staleTime: QUOTE_STALE_TIME_MS,
  });
}

export function useStockProfile(stockCode: string) {
  return useQuery({
    queryKey: [...queryKeys.stocks.detail(stockCode), 'profile'],
    queryFn: () => getStockProfile(stockCode),
    staleTime: PROFILE_STALE_TIME_MS,
  });
}

export function useStockCandles(stockCode: string, period: CandlePeriod) {
  return useQuery({
    queryKey: queryKeys.stocks.candles(stockCode, period),
    queryFn: () => getStockCandles(stockCode, period),
    staleTime: CANDLE_STALE_TIME_MS,
  });
}

export function useStockAnalysis(
  stockCode: string,
  outcome: MockAnalysisOutcome,
) {
  return useQuery({
    // outcome 은 목 전용 인자지만 키에 넣어야 상태를 바꿔도 캐시가 갈린다.
    // MSW 핸들러가 들어오면 인자와 함께 키에서도 빠진다.
    queryKey: [...queryKeys.stocks.analysis(stockCode), outcome],
    queryFn: () => getStockAnalysis(stockCode, outcome),
    staleTime: ANALYSIS_STALE_TIME_MS,
    // AI 실패는 정상 상태다. 자동 재시도로 사용자를 기다리게 하지 않고
    // 화면이 실패를 그리고 재시도 수단을 준다.
    retry: false,
  });
}

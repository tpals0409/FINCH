import { isHttpError, isSchemaError, request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  CandlesResponseSchema,
  type CandlesResponse,
  type CandlePeriod,
} from '@/shared/types/stock';

type CandleRequestFailure = {
  boundary: 'stocks.candles';
  stockCode: string;
  period: CandlePeriod;
  status: number | null;
  classification: 'http' | 'schema' | 'unknown';
  code: string | null;
};

function logRequestFailure(
  stockCode: string,
  period: CandlePeriod,
  error: unknown,
) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return;
  }

  const failure: CandleRequestFailure = {
    boundary: 'stocks.candles',
    stockCode,
    period,
    status: isHttpError(error) ? error.status : null,
    classification: isHttpError(error)
      ? 'http'
      : isSchemaError(error)
        ? 'schema'
        : 'unknown',
    code: isHttpError(error) ? error.code : null,
  };

  // 원문 응답·JWT·사용자 정보는 남기지 않는다. 요청 경계와 분류만 디버깅 근거로 쓴다.
  console.error('[StockCandlesRequest]', failure);
}

/** 종목 일봉 캔들 조회 (apiSpec §5.3). */
export async function getStockCandles(
  stockCode: string,
  period: CandlePeriod,
  signal?: AbortSignal,
): Promise<CandlesResponse> {
  const query = new URLSearchParams({ period });

  try {
    return await request(
      `${API_PATHS.stocks.candles(stockCode)}?${query.toString()}`,
      {
        schema: CandlesResponseSchema,
        signal,
      },
    );
  } catch (error) {
    logRequestFailure(stockCode, period, error);
    throw error;
  }
}

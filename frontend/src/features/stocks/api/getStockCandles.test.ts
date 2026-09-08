import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/api';
import type * as SharedApi from '@/shared/api';
import { CandlesResponseSchema } from '@/shared/types/stock';

import { getStockCandles } from './getStockCandles';

const requestMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<typeof SharedApi>()),
  request: requestMock,
}));

const response = CandlesResponseSchema.parse({
  stockCode: '005930',
  period: '3M',
  interval: 'DAY',
  candles: [],
});

afterEach(() => {
  vi.restoreAllMocks();
  requestMock.mockReset();
});

describe('getStockCandles', () => {
  it('기간을 쿼리에 포함하고 캔들 스키마로 요청한다', async () => {
    requestMock.mockResolvedValue(response);

    await expect(getStockCandles('005930', '3M')).resolves.toBe(response);
    expect(requestMock).toHaveBeenCalledWith(
      '/stocks/005930/candles?period=3M',
      {
        schema: expect.any(Object),
        signal: undefined,
      },
    );
  });

  it('HTTP 실패는 원문 없이 요청 경계·상태·분류만 기록한다', async () => {
    const error = new HttpError({
      status: 503,
      code: 'INTERNAL_ERROR',
      message: '원문 서버 메시지',
    });
    requestMock.mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(getStockCandles('005930', '1Y')).rejects.toBe(error);
    expect(consoleError).toHaveBeenCalledWith('[StockCandlesRequest]', {
      boundary: 'stocks.candles',
      stockCode: '005930',
      period: '1Y',
      status: 503,
      classification: 'http',
      code: 'INTERNAL_ERROR',
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      '원문 서버 메시지',
    );
  });

  it('화면 이탈로 취소된 요청은 오류로 기록하지 않는다', async () => {
    const error = new DOMException('aborted', 'AbortError');
    requestMock.mockRejectedValue(error);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(getStockCandles('005930', '1M')).rejects.toBe(error);
    expect(consoleError).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from 'vitest';

import {
  getQuotePollingOptions,
  QUOTE_POLLING_INTERVAL_MS,
} from './apiContract';

describe('getQuotePollingOptions', () => {
  it('uses the list and order defaults', () => {
    expect(getQuotePollingOptions('list')).toEqual({
      refetchInterval: 5_000,
      staleTime: 4_000,
    });
    expect(getQuotePollingOptions('order')).toEqual({
      refetchInterval: 3_000,
      staleTime: 2_400,
    });
  });

  it('derives freshness from an injected interval', () => {
    expect(getQuotePollingOptions('list', { intervalMs: 1_250 })).toEqual({
      refetchInterval: 1_250,
      staleTime: 1_000,
    });
  });

  it('allows freshness to be injected independently', () => {
    expect(
      getQuotePollingOptions('order', {
        intervalMs: QUOTE_POLLING_INTERVAL_MS.order,
        staleTimeMs: 500,
      }),
    ).toEqual({
      refetchInterval: 3_000,
      staleTime: 500,
    });
  });
});

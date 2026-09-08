import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PullToRefresh } from './PullToRefresh';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function touchEvent(type: string, y?: number) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    value: y === undefined ? [] : [{ clientX: 0, clientY: y }],
  });
  return event;
}

let host: HTMLDivElement;
let root: Root;
let queryClient: QueryClient;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  queryClient = new QueryClient();
  act(() =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <PullToRefresh />
      </QueryClientProvider>,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  queryClient.clear();
});

describe('PullToRefresh', () => {
  it('임계를 넘겨 놓으면 활성 조회만 다시 불러온다', async () => {
    const refetch = vi
      .spyOn(queryClient, 'refetchQueries')
      .mockResolvedValue(undefined);

    act(() => window.dispatchEvent(touchEvent('touchstart', 0)));
    act(() => window.dispatchEvent(touchEvent('touchmove', 120)));
    expect(host.textContent).toContain('놓아서 새로고침');

    await act(async () => {
      window.dispatchEvent(touchEvent('touchend'));
      await Promise.resolve();
    });

    expect(refetch).toHaveBeenCalledWith({ type: 'active' });
  });
});

import { describe, expect, it } from 'vitest';

import { pullDistance, shouldRefresh } from './pullGesture';

describe('PullToRefresh gesture boundary', () => {
  it('위쪽·짧은 움직임은 새로고침으로 판정하지 않는다', () => {
    expect(pullDistance(-20)).toBe(0);
    expect(shouldRefresh(pullDistance(80))).toBe(false);
  });

  it('충분한 당김은 임계에서 새로고침하고 진행량은 상한을 넘지 않는다', () => {
    expect(shouldRefresh(pullDistance(112))).toBe(true);
    expect(pullDistance(1_000)).toBe(72);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { installPreloadErrorRecovery } from './preloadErrorRecovery';

describe('installPreloadErrorRecovery', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('연속 preload 오류에서는 reload를 한 번만 호출한다', () => {
    const reload = vi.fn();
    installPreloadErrorRecovery({ reload });

    window.dispatchEvent(new Event('vite:preloadError'));
    window.dispatchEvent(new Event('vite:preloadError'));

    expect(reload).toHaveBeenCalledTimes(1);
  });
});

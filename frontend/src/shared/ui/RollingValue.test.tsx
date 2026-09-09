import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RollingValue } from './RollingValue';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
let animate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  animate = vi.fn(() => ({ cancel: vi.fn() }));
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: animate,
  });
  Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('RollingValue', () => {
  it('값이 바뀌면 transform 기반 애니메이션을 실행한다', () => {
    act(() => root.render(<RollingValue value="73,500원" />));
    act(() => root.render(<RollingValue value="73,600원" />));

    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.calls[0]?.[0]).toEqual([
      { transform: 'translateY(-0.35em)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ]);
  });

  it('reduced-motion이면 애니메이션 없이 새 값을 표시한다', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    act(() => root.render(<RollingValue value="73,500원" />));
    act(() => root.render(<RollingValue value="73,600원" />));

    expect(host.textContent).toBe('73,600원');
    expect(animate).not.toHaveBeenCalled();
  });
});

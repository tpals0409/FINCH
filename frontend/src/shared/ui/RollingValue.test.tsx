import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseCssDuration } from '@/shared/lib/parseCssDuration';

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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('RollingValue', () => {
  it.each([
    ['.2s', 200],
    ['0.2s', 200],
    ['200ms', 200],
    ['.26s', 260],
    ['260ms', 260],
    ['', 260],
  ])('CSS 시간 %s를 %sms로 해석한다', (value, expected) => {
    expect(parseCssDuration(value)).toBe(expected);
  });

  it('값이 바뀌면 transform 기반 애니메이션을 실행한다', () => {
    act(() => root.render(<RollingValue value="73,500원" />));
    act(() => root.render(<RollingValue value="73,600원" />));

    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.calls[0]?.[0]).toEqual([
      { transform: 'translateY(-0.35em)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ]);
    expect(animate.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ duration: 260 }),
    );
  });

  it('직전 숫자 값의 방향에 맞는 색상으로 변화 신호를 표시한다', () => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const hasRiseClass = (element as HTMLElement).classList.contains(
        'text-fg-up',
      );
      const hasFallClass = (element as HTMLElement).classList.contains(
        'text-fg-down',
      );
      return {
        color: hasRiseClass ? '#a01015' : hasFallClass ? '#3f75dd' : '#121417',
        getPropertyValue: (property: string) =>
          property === '--motion-sheet' ? '260ms' : '',
      } as CSSStyleDeclaration;
    });

    act(() =>
      root.render(
        <RollingValue
          value="73,500원"
          numericValue={73500}
          flashClasses={{ rise: 'text-fg-up', fall: 'text-fg-down' }}
        />,
      ),
    );
    act(() =>
      root.render(
        <RollingValue
          value="73,400원"
          numericValue={73400}
          flashClasses={{ rise: 'text-fg-up', fall: 'text-fg-down' }}
        />,
      ),
    );

    expect(animate.mock.calls[0]?.[0]).toEqual([
      {
        transform: 'translateY(-0.35em)',
        opacity: 0,
        color: '#3f75dd',
      },
      { transform: 'translateY(0)', opacity: 1, color: '#121417' },
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

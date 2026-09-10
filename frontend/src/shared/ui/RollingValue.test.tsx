import { act, createElement, forwardRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatKrw, formatSignedPercent } from '@/shared/lib/formatNumber';
import { parseCssDuration } from '@/shared/lib/parseCssDuration';
import type { Percent } from '@/shared/types/primitives';

import { RollingValue } from './RollingValue';

vi.mock('@number-flow/react', () => ({
  default: forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
    const { format, locales, prefix, suffix, value, ...attributes } = props;
    const formatted = new Intl.NumberFormat(
      locales as Intl.LocalesArgument,
      format as Intl.NumberFormatOptions,
    ).format(value as number);
    return createElement(
      'span',
      { ...attributes, ref },
      `${prefix ?? ''}${formatted}${suffix ?? ''}`,
    );
  }),
}));

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

  it('기존 포맷터와 같은 원화·퍼센트 문자열을 렌더한다', () => {
    const krwValue = formatKrw(73500);
    const percentValue = formatSignedPercent(1234.5 as Percent);

    act(() =>
      root.render(
        <RollingValue
          value={krwValue}
          numericValue={73500}
          format={{ maximumFractionDigits: 0, useGrouping: true }}
          suffix="원"
        />,
      ),
    );

    expect(host.textContent).toBe(krwValue);

    act(() =>
      root.render(
        <RollingValue
          value={percentValue}
          numericValue={1234.5}
          format={{
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            signDisplay: 'exceptZero',
            useGrouping: false,
          }}
          suffix="%"
        />,
      ),
    );

    expect(host.textContent).toBe(percentValue);
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
      { color: '#3f75dd' },
      { color: '#121417' },
    ]);
  });

  it('reduced-motion이면 애니메이션 없이 새 값을 표시한다', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    act(() =>
      root.render(
        <RollingValue value="73,500원" numericValue={73500} suffix="원" />,
      ),
    );
    act(() =>
      root.render(
        <RollingValue value="73,600원" numericValue={73600} suffix="원" />,
      ),
    );

    expect(host.textContent).toBe('73,600원');
    expect(animate).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from 'vitest';

import { PercentSchema, RatioSchema } from '@/shared/types/primitives';

import {
  formatSignedPercent,
  formatSignedRatioAsPercent,
} from './formatNumber';

/**
 * 두 포매터가 서로 다른 계열(`Percent` vs `Ratio`)에서 정확히 맞는 값을 내는지 확인한다.
 * 인자를 바꿔 넣으면 컴파일이 막혀야 한다는 요구는 타입 레벨 보장이라 런타임 테스트로
 * 재현하지 않는다 — 여기서는 각 계열이 자기 입력에서 옳은 숫자를 내는 것만 본다.
 */
describe('formatSignedPercent (Percent — 이미 백분율, 100을 곱하지 않는다)', () => {
  it('음수를 부호와 함께 그대로 보여준다', () => {
    expect(formatSignedPercent(PercentSchema.parse(-1.21))).toBe('-1.21%');
  });

  it('양수에는 + 부호를 붙인다', () => {
    expect(formatSignedPercent(PercentSchema.parse(3.5))).toBe('+3.50%');
  });

  it('0은 부호 없이 보여준다', () => {
    expect(formatSignedPercent(PercentSchema.parse(0))).toBe('0.00%');
  });
});

describe('formatSignedRatioAsPercent (Ratio — 0~1 소수, 100을 곱한다)', () => {
  it('0.0512(5.12%)를 100배로 그린다', () => {
    expect(formatSignedRatioAsPercent(RatioSchema.parse(0.0512))).toBe(
      '+5.12%',
    );
  });

  it('음수 비율도 100배로 그린다', () => {
    expect(formatSignedRatioAsPercent(RatioSchema.parse(-0.2214))).toBe(
      '-22.14%',
    );
  });
});

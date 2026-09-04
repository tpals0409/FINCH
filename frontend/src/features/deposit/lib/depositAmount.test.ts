import { describe, expect, it } from 'vitest';

import { DEPOSIT_ERROR_CODES } from '@/shared/types/errorCodes';

import { PER_REQUEST_LIMIT, validateDepositAmount } from './depositAmount';

/**
 * 돈이 오가는 경로의 경계값을 고정한다. 서버의 `ck_deposit_amount` 가 같은 값을 막고 있어
 * 여기가 어긋나면 화면이 통과시킨 요청이 409 로 끝난다.
 */
describe('validateDepositAmount', () => {
  it('0 이하는 AMOUNT_INVALID 다', () => {
    expect(validateDepositAmount(0)).toBe(DEPOSIT_ERROR_CODES.AMOUNT_INVALID);
    expect(validateDepositAmount(-1)).toBe(DEPOSIT_ERROR_CODES.AMOUNT_INVALID);
  });

  it('정수가 아니면 AMOUNT_INVALID 다 — 원 단위 정수다 (컨벤션 §6)', () => {
    expect(validateDepositAmount(1000.5)).toBe(
      DEPOSIT_ERROR_CODES.AMOUNT_INVALID,
    );
    expect(validateDepositAmount(Number.NaN)).toBe(
      DEPOSIT_ERROR_CODES.AMOUNT_INVALID,
    );
  });

  it('1회 한도 경계 — 딱 1,000만 원은 통과하고 1원 더는 막힌다', () => {
    expect(validateDepositAmount(PER_REQUEST_LIMIT)).toBeNull();
    expect(validateDepositAmount(PER_REQUEST_LIMIT + 1)).toBe(
      DEPOSIT_ERROR_CODES.PER_REQUEST_LIMIT_EXCEEDED,
    );
  });

  it('1회 한도는 서버와 같은 1,000만 원이다', () => {
    expect(PER_REQUEST_LIMIT).toBe(10_000_000);
  });

  it('누적 한도는 보지 않는다 — 낡은 값으로 정상 요청을 거절하면 안 된다', () => {
    // 누적 한도(1억)를 넘는 금액이어도 1회 한도 안이면 화면은 통과시킨다.
    // 판정은 서버가 하고 화면은 detail.remainingAmount 를 받아 쓴다.
    expect(validateDepositAmount(9_999_999)).toBeNull();
  });
});

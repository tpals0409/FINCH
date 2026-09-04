import { DEPOSIT_ERROR_CODES } from '@/shared/types/errorCodes';

/**
 * 1회 충전 한도 (apiSpec §4.2). 서버의 `Deposit.PER_REQUEST_LIMIT`·`ck_deposit_amount` 와
 * 같은 값이어야 한다 — 갈리면 화면이 통과시킨 요청이 서버에서 409 로 끝난다.
 */
export const PER_REQUEST_LIMIT = 10_000_000;

/** 금액 입력 프리셋 (featureSpec §3.2). */
export const AMOUNT_PRESETS = [10_000, 100_000, 1_000_000] as const;

/**
 * 화면이 먼저 막을 수 있는 금액 오류 (와이어프레임 아트보드 7).
 *
 * **누적 한도는 여기서 보지 않는다.** `GET /deposits/limit` 을 받은 뒤 다른 탭·세션에서
 * 충전이 일어나면 `remainingAmount` 가 낡으므로, 그 판정은 서버 왕복이 꼭 필요하다.
 * 여기서 미리 막으면 낡은 값으로 정상 요청을 거절하게 된다.
 *
 * 반환값이 에러 **코드**인 이유 — 문구는 서버가 완성해 내려준다 (apiSpec §1.3). 화면이 문구를
 * 새로 만들면 같은 상황에서 서버 문구와 화면 문구가 갈린다.
 */
export type DepositAmountError =
  | typeof DEPOSIT_ERROR_CODES.AMOUNT_INVALID
  | typeof DEPOSIT_ERROR_CODES.PER_REQUEST_LIMIT_EXCEEDED;

export function validateDepositAmount(
  amount: number,
): DepositAmountError | null {
  if (!Number.isInteger(amount) || amount <= 0) {
    return DEPOSIT_ERROR_CODES.AMOUNT_INVALID;
  }
  if (amount > PER_REQUEST_LIMIT) {
    return DEPOSIT_ERROR_CODES.PER_REQUEST_LIMIT_EXCEEDED;
  }

  return null;
}

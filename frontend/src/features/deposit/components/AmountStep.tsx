import { useState } from 'react';

import { formatKrw } from '@/shared/lib/formatNumber';
import { DEPOSIT_ERROR_CODES } from '@/shared/types/errorCodes';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

import {
  AMOUNT_PRESETS,
  validateDepositAmount,
  type DepositAmountError,
} from '../lib/depositAmount';

/**
 * 2/3 금액 입력 (featureSpec §3.2 · 와이어프레임 아트보드 4·7).
 *
 * **여기서 막는 것은 둘뿐이다** — 0원 이하와 1회 한도 초과. 누적 한도는 서버 왕복이 꼭
 * 필요해서 확인 화면에서 받는다 (`GET /deposits/limit` 을 받은 뒤 다른 탭·세션이 충전하면
 * `remainingAmount` 가 낡는다).
 *
 * 문구는 서버 enum 의 `message` 를 그대로 옮겼다. 화면이 문구를 새로 만들면 같은 상황에서
 * 서버 문구와 화면 문구가 갈린다 (apiSpec §1.3).
 */
const MESSAGE: Record<DepositAmountError, string> = {
  [DEPOSIT_ERROR_CODES.AMOUNT_INVALID]: '충전 금액은 1원 이상이어야 합니다',
  [DEPOSIT_ERROR_CODES.PER_REQUEST_LIMIT_EXCEEDED]:
    '1회 충전 한도는 1,000만 원입니다',
};

type Props = {
  cumulativeLimit: number;
  remainingAmount: number;
  onSubmit: (amount: number) => void;
};

export function AmountStep({
  cumulativeLimit,
  remainingAmount,
  onSubmit,
}: Props) {
  const [amount, setAmount] = useState(0);
  // 입력하는 동안 빨간 글씨가 따라다니지 않게 제출 시점에만 검증 결과를 보여준다.
  const [touched, setTouched] = useState(false);

  const error = validateDepositAmount(amount);

  return (
    <Card>
      <p className="text-caption text-fg-neutral-subtle">2 / 3</p>
      <h2 className="mt-1 text-title-3 text-fg-neutral">
        충전 금액을 입력하세요
      </h2>

      <label className="mt-5 block">
        <span className="sr-only">충전 금액</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={amount === 0 ? '' : amount}
          placeholder="0"
          onChange={(event) => setAmount(Number(event.target.value))}
          className="w-full border-b border-stroke-neutral-weak bg-transparent pb-2 text-display text-fg-neutral placeholder:text-fg-placeholder focus:outline-none"
        />
      </label>

      <div className="mt-3 flex gap-2">
        {AMOUNT_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount((current) => current + preset)}
            className="min-h-[44px] flex-1 rounded-sm border border-stroke-neutral-weak text-label text-fg-neutral"
          >
            +{(preset / 10_000).toLocaleString('ko-KR')}만
          </button>
        ))}
      </div>

      {touched && error !== null ? (
        <p className="mt-3 text-caption text-fg-neutral">{MESSAGE[error]}</p>
      ) : null}

      <dl className="mt-5 space-y-1 border-t border-stroke-neutral-subtle pt-4 text-caption">
        <div className="flex justify-between">
          <dt className="text-fg-neutral-subtle">누적 한도</dt>
          <dd className="text-fg-neutral">{formatKrw(cumulativeLimit)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-fg-neutral-subtle">잔여 한도</dt>
          <dd className="text-fg-neutral">{formatKrw(remainingAmount)}</dd>
        </div>
      </dl>

      <Button
        className="mt-5"
        onClick={() => {
          setTouched(true);
          if (error === null) {
            onSubmit(amount);
          }
        }}
      >
        다음
      </Button>
    </Card>
  );
}

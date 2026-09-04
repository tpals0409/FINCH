import { formatKrw } from '@/shared/lib/formatNumber';
import { PAYMENT_METHOD_LABEL } from '@/shared/lib/paymentMethod';
import type { PaymentMethod } from '@/shared/types/deposit';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

/**
 * 3/3 확인 (featureSpec §3.2 · 와이어프레임 아트보드 5·8).
 *
 * **"충전은 취소할 수 없습니다" 를 고정 노출한다.** 조건부가 아니라 항상이다 —
 * 충전 취소 API 가 아예 없고(featureSpec §1.1·3.2), 되돌릴 수 없다는 사실은 에러가 났을
 * 때만 참인 것이 아니다.
 *
 * 누적 한도 초과일 때만 잔여 한도로 다시 시도하는 두 번째 버튼이 뜬다. **라벨에 금액을
 * 반드시 적는다** — 확인 화면의 금액과 실제 나가는 금액이 달라지는 유일한 자리라서,
 * "충전하기" 뿐이면 원래 입력한 금액이 나갈 것으로 읽힌다.
 */
type Props = {
  amount: number;
  paymentMethod: PaymentMethod;
  cashBalance: number;
  /** 누적 한도 초과 시 서버가 준 값 (`detail.remainingAmount`). 아니면 null. */
  limitExceededRemaining: number | null;
  errorMessage: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  onEditAmount: () => void;
  onSubmitRemaining: (remaining: number) => void;
};

export function ConfirmStep({
  amount,
  paymentMethod,
  cashBalance,
  limitExceededRemaining,
  errorMessage,
  isSubmitting,
  onSubmit,
  onEditAmount,
  onSubmitRemaining,
}: Props) {
  const exceeded = limitExceededRemaining !== null;

  return (
    <Card>
      <p className="text-caption text-fg-neutral-subtle">3 / 3</p>
      <h2 className="mt-1 text-title-3 text-fg-neutral">충전 확인</h2>

      {errorMessage !== null ? (
        <p className="mt-4 text-body-2 text-fg-neutral">{errorMessage}</p>
      ) : null}

      <dl className="mt-5 space-y-3">
        <div>
          <dt className="text-caption text-fg-neutral-subtle">충전 금액</dt>
          <dd className="mt-1 text-display text-fg-neutral">
            {formatKrw(amount)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-stroke-neutral-subtle pt-3">
          <dt className="text-body-2 text-fg-neutral-subtle">결제 수단</dt>
          <dd className="text-body-2 text-fg-neutral">
            {PAYMENT_METHOD_LABEL[paymentMethod]}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-body-2 text-fg-neutral-subtle">
            {exceeded ? '잔여 한도' : '충전 후 예수금'}
          </dt>
          <dd className="text-body-2 text-fg-neutral">
            {formatKrw(
              exceeded ? limitExceededRemaining : cashBalance + amount,
            )}
          </dd>
        </div>
      </dl>

      <p className="mt-5 border-t border-stroke-neutral-subtle pt-4 text-caption text-fg-neutral-subtle">
        충전은 취소할 수 없습니다
      </p>

      {exceeded ? (
        <div className="mt-5 space-y-2">
          <Button variant="secondary" onClick={onEditAmount}>
            금액 다시 입력
          </Button>
          {limitExceededRemaining > 0 ? (
            <Button
              onClick={() => onSubmitRemaining(limitExceededRemaining)}
              disabled={isSubmitting}
            >
              잔여 한도 {formatKrw(limitExceededRemaining)} 충전하기
            </Button>
          ) : null}
        </div>
      ) : (
        <Button className="mt-5" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? '처리 중…' : `${formatKrw(amount)} 충전하기`}
        </Button>
      )}
    </Card>
  );
}

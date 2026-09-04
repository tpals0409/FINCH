import { PAYMENT_METHOD_LABEL } from '@/shared/lib/paymentMethod';
import type { PaymentMethod } from '@/shared/types/deposit';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

/**
 * 1/3 결제 수단 선택 (featureSpec §3.1 · 와이어프레임 아트보드 3).
 *
 * **실제 금전 이동은 없다.** 실제 결제와 유사한 절차를 밟게 하려고 두는 시뮬레이션용
 * 선택지이고, 어느 값을 골라도 처리 경로가 같다.
 */
const METHODS: readonly PaymentMethod[] = ['VIRTUAL_CARD', 'VIRTUAL_TRANSFER'];

type Props = { onSelect: (method: PaymentMethod) => void };

export function PaymentMethodStep({ onSelect }: Props) {
  return (
    <Card>
      <p className="text-caption text-fg-neutral-subtle">1 / 3</p>
      <h2 className="mt-1 text-title-3 text-fg-neutral">
        결제 수단을 선택하세요
      </h2>

      <div className="mt-5 space-y-2">
        {METHODS.map((method) => (
          <Button
            key={method}
            variant="secondary"
            onClick={() => onSelect(method)}
          >
            {PAYMENT_METHOD_LABEL[method]}
          </Button>
        ))}
      </div>
    </Card>
  );
}

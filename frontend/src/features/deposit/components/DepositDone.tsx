import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { formatKstDateTime } from '@/shared/lib/formatDate';
import { formatKrw } from '@/shared/lib/formatNumber';
import { PAYMENT_METHOD_LABEL } from '@/shared/lib/paymentMethod';
import type { DepositResponse } from '@/shared/types/deposit';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

/**
 * 완료 (와이어프레임 아트보드 6).
 *
 * **모든 값이 응답에서 온다.** 충전 후 예수금을 화면에서 더하지 않는다 — 서버가 준
 * `cashBalanceAfter` 가 원장 기준이고, 화면이 더하면 동시에 다른 충전이 있었을 때 어긋난다.
 *
 * `depositedAt` 도 서버 값이다. 재시도로 받은 재생 응답이면 **최초 충전 시각**이 오는데,
 * 그것이 맞다 — 두 번째 요청은 처리되지 않았으므로 새 시각이 있을 수 없다 (apiSpec §1.4).
 */
type Props = { deposit: DepositResponse; onDepositAgain: () => void };

export function DepositDone({ deposit, onDepositAgain }: Props) {
  return (
    <Card>
      <p className="text-caption text-fg-neutral-subtle">충전 완료</p>
      <p className="mt-1 text-display text-fg-neutral">
        {formatKrw(deposit.amount)}
      </p>

      <dl className="mt-5 space-y-3 border-t border-stroke-neutral-subtle pt-4">
        <div className="flex justify-between">
          <dt className="text-body-2 text-fg-neutral-subtle">결제 수단</dt>
          <dd className="text-body-2 text-fg-neutral">
            {PAYMENT_METHOD_LABEL[deposit.paymentMethod]}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-body-2 text-fg-neutral-subtle">충전 후 예수금</dt>
          <dd className="text-body-2 text-fg-neutral">
            {formatKrw(deposit.cashBalanceAfter)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-body-2 text-fg-neutral-subtle">일시</dt>
          <dd className="text-body-2 text-fg-neutral">
            {formatKstDateTime(deposit.depositedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 space-y-2">
        <Button onClick={onDepositAgain} variant="secondary">
          더 충전하기
        </Button>
        <Link
          to={ROUTES.portfolio}
          className="flex min-h-[54px] w-full items-center justify-center rounded-md bg-bg-neutral-solid text-label text-fg-neutral-inverted"
        >
          잔고로 돌아가기
        </Link>
      </div>
    </Card>
  );
}

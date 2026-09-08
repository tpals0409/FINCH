import { ROUTES } from '@/shared/config/routes';
import { formatKstDateTime } from '@/shared/lib/formatDate';
import { formatKrw } from '@/shared/lib/formatNumber';
import { PAYMENT_METHOD_LABEL } from '@/shared/lib/paymentMethod';
import type { DepositResponse } from '@/shared/types/deposit';
import { Button, LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SeparatedGroup } from '@/shared/ui/SeparatedGroup';
import { SupportingText } from '@/shared/ui/SupportingText';

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
      <SupportingText size="caption">충전 완료</SupportingText>
      <p className="mt-1 text-display text-fg-neutral">
        {formatKrw(deposit.amount)}
      </p>

      <SeparatedGroup as="dl">
        <div className="flex justify-between">
          <SupportingText as="dt">결제 수단</SupportingText>
          <dd className="text-body-2 text-fg-neutral">
            {PAYMENT_METHOD_LABEL[deposit.paymentMethod]}
          </dd>
        </div>
        <div className="flex justify-between">
          <SupportingText as="dt">충전 후 예수금</SupportingText>
          <dd className="text-body-2 text-fg-neutral">
            {formatKrw(deposit.cashBalanceAfter)}
          </dd>
        </div>
        <div className="flex justify-between">
          <SupportingText as="dt">일시</SupportingText>
          <dd className="text-body-2 text-fg-neutral">
            {formatKstDateTime(deposit.depositedAt)}
          </dd>
        </div>
      </SeparatedGroup>

      <div className="mt-5 space-y-2">
        <Button onClick={onDepositAgain} variant="secondary">
          더 충전하기
        </Button>
        {/*
          손으로 Link 에 버튼 클래스를 붙이지 않는다. shared/ui 의 LinkButton 이 같은 모양을
          이미 갖고 있고, 직접 적으면 비활성 색·전환처럼 나중에 Button 에 더해지는 것을
          이 자리만 못 받는다.
        */}
        <LinkButton to={ROUTES.portfolio}>잔고로 돌아가기</LinkButton>
      </div>
    </Card>
  );
}

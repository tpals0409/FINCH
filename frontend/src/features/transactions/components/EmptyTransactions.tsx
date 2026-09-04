import type { TransactionFilter } from '@/shared/types/portfolio';
import { Card } from '@/shared/ui/Card';

import { emptyTransactionsMessage } from '../lib/emptyTransactionsMessage';

/**
 * 필터별 빈 상태 (와이어프레임 아트보드 12·13).
 *
 * **버튼을 두지 않는다.** 매수·매도 탭은 주문 화면이 없어 눌러도 갈 곳이 없고, 충전 탭은
 * 잔고 화면의 "충전하기" 가 이미 진입점이라 같은 동선이 둘이 된다.
 */
export function EmptyTransactions({ filter }: { filter: TransactionFilter }) {
  return (
    <Card className="mt-4 text-center">
      <p className="text-body-1 text-fg-neutral">
        {emptyTransactionsMessage(filter)}
      </p>
    </Card>
  );
}

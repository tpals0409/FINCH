import { formatKstDateLabel } from '@/shared/lib/formatDate';
import type { Transaction } from '@/shared/types/portfolio';

import { TransactionRow } from './TransactionRow';

/**
 * 날짜로 묶은 내역 목록 (와이어프레임 아트보드 10~11).
 *
 * **응답에 그룹 필드가 없다.** 화면이 `occurredAt` 으로 묶는다 (apiSpec §8.2). 정렬은 서버가
 * 최신순으로 고정해 주므로 여기서 다시 정렬하지 않는다 — 다시 정렬하면 커서 페이징으로 이어
 * 붙인 페이지 경계에서 순서가 뒤집힐 수 있다.
 */
type Props = { transactions: readonly Transaction[] };

export function TransactionList({ transactions }: Props) {
  const groups = groupByDate(transactions);

  return (
    <div className="mt-2">
      {groups.map((group) => (
        <section key={group.date}>
          <h3 className="pt-4 pb-1 text-caption text-fg-neutral-subtle">
            {group.date}
          </h3>
          <ul className="divide-y divide-stroke-neutral-subtle">
            {group.items.map((transaction) => (
              <TransactionRow
                key={transaction.transactionId}
                transaction={transaction}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** 이미 최신순으로 온 배열을 순서대로 훑으며 날짜가 바뀔 때만 그룹을 연다. */
function groupByDate(
  transactions: readonly Transaction[],
): Array<{ date: string; items: Transaction[] }> {
  const groups: Array<{ date: string; items: Transaction[] }> = [];

  for (const transaction of transactions) {
    const date = formatKstDateLabel(transaction.occurredAt);
    const last = groups.at(-1);

    if (last !== undefined && last.date === date) {
      last.items.push(transaction);
    } else {
      groups.push({ date, items: [transaction] });
    }
  }

  return groups;
}

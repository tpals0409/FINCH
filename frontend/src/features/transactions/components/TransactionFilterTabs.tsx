import * as Tabs from '@radix-ui/react-tabs';

import type { TransactionFilter } from '@/shared/types/portfolio';

/**
 * 필터 탭 (apiSpec §8.2 · featureSpec §8 · 와이어프레임 아트보드 10~13).
 *
 * **"충전" 이지 "입금" 이 아니다.** 이 탭은 모의 결제 건만 담고 초기 지급 1,000,000원은
 * 없다. "입금" 으로 부르면 사용자가 초기 지급도 그 안에 있을 것으로 기대하는데 실제로는
 * 없다 — 이름이 계약과 어긋나는 자리다.
 *
 * radix `Tabs` 를 쓰는 이유 — 화살표 키 이동과 `role="tablist"` 를 직접 만들지 않는다.
 * 이미 설치돼 있고(package.json) 이 화면이 첫 사용처다.
 */
const OPTIONS: ReadonlyArray<{ value: TransactionFilter; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'BUY', label: '매수' },
  { value: 'SELL', label: '매도' },
  { value: 'DEPOSIT', label: '충전' },
];

type Props = {
  value: TransactionFilter;
  onChange: (next: TransactionFilter) => void;
};

export function TransactionFilterTabs({ value, onChange }: Props) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => onChange(next as TransactionFilter)}
    >
      <Tabs.List
        aria-label="내역 필터"
        className="flex gap-1 rounded-md bg-bg-skeleton p-1"
      >
        {OPTIONS.map((option) => (
          <Tabs.Trigger
            key={option.value}
            value={option.value}
            className="flex-1 rounded-sm py-2 text-label text-fg-neutral-subtle data-[state=active]:bg-bg-layer-default data-[state=active]:text-fg-neutral"
          >
            {option.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}

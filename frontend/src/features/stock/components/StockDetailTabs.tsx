import * as Tabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

import { STOCK_DETAIL_TABS, type StockDetailTab } from '../model/stockDetail';

type StockDetailTabsProps = {
  value: StockDetailTab;
  onValueChange: (tab: StockDetailTab) => void;
  chart: ReactNode;
  info: ReactNode;
  ai: ReactNode;
};

const TAB_LABEL: Record<StockDetailTab, string> = {
  chart: '도판',
  info: '기업',
  ai: '소견',
};

/**
 * 지면의 색인 줄.
 *
 * 알약도 캡슐도 아니다. 괘선으로 칸을 나눈 한 줄이고, 고른 칸만 아래에 2px
 * 먹선이 그어진다. 채움색을 쓰지 않는 이유는 이 화면에서 채워진 사각이
 * 주문 버튼 하나여야 하기 때문이다.
 *
 * 값은 URL 쿼리 파라미터에 있다. 모바일에서는 뒤로가기를 훨씬 자주 쓰므로
 * 탭 선택을 `useState` 에 두면 바로 티가 난다 (IA §2). Radix 를 쓰는 이유는
 * 키보드 좌우 이동과 `aria-selected` 배선을 직접 쓰지 않기 위해서다.
 */
export function StockDetailTabs({
  value,
  onValueChange,
  chart,
  info,
  ai,
}: StockDetailTabsProps) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(next) => onValueChange(next as StockDetailTab)}
    >
      <Tabs.List
        aria-label="종목 상세 항목"
        className="flex border-t border-rule"
      >
        {STOCK_DETAIL_TABS.map((tab) => (
          <Tabs.Trigger
            key={tab}
            value={tab}
            className="min-h-11 flex-1 border-r border-rule-faint font-display text-sm tracking-[0.06em] text-ink-muted last:border-r-0 data-[state=active]:border-b-2 data-[state=active]:border-b-ink data-[state=active]:font-semibold data-[state=active]:text-ink"
          >
            {TAB_LABEL[tab]}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="chart">{chart}</Tabs.Content>
      <Tabs.Content value="info">{info}</Tabs.Content>
      <Tabs.Content value="ai">{ai}</Tabs.Content>
    </Tabs.Root>
  );
}

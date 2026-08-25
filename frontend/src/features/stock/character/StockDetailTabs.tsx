// DIRECTION: character (S15P21A101-93)

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
  chart: '차트',
  info: '기업',
  ai: 'AI',
};

/**
 * 분절 컨트롤로 만든 탭 줄. props 는 애플 방향과 같다.
 *
 * 트랙은 크림보다 한 단 눌린 면이고, 고른 칸은 카드와 같은 흰 알약이다.
 * 활성 칸에 **색을 채우지 않는다.** 이 화면의 유채색은 상승 적·하락 청·새의
 * 몸 셋뿐이고, 네 번째 색을 만드는 순간 사용자가 그 색의 뜻을 배워야 한다.
 * 흰 알약 + 먹 글자만으로 활성은 충분히 읽힌다.
 *
 * 값은 URL 쿼리 파라미터에 있다 (IA §2). Radix 를 쓰는 이유는 키보드 좌우
 * 이동과 `aria-selected` 배선을 직접 쓰지 않기 위해서다.
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
        className="flex gap-1 rounded-full border border-[var(--character-border)] bg-[var(--character-sunken)] p-1"
      >
        {STOCK_DETAIL_TABS.map((tab) => (
          <Tabs.Trigger
            key={tab}
            value={tab}
            /* 테두리를 활성일 때만 붙이면 1px 씩 밀린다. 투명 테두리를 항상
               두고 색만 바꾼다. */
            className="min-h-11 flex-1 rounded-full border border-transparent text-[0.9375rem] font-medium text-[var(--character-text-muted)] transition-colors duration-200 data-[state=active]:border-[var(--character-border)] data-[state=active]:bg-[var(--character-surface)] data-[state=active]:font-semibold data-[state=active]:text-[var(--character-text)] data-[state=active]:shadow-[var(--character-shadow-card)]"
          >
            {TAB_LABEL[tab]}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* 탭 줄과 패널 사이 한 겹. 패널이 트랙에 붙으면 한 덩어리로 읽힌다. */}
      <div className="mt-3">
        <Tabs.Content value="chart">{chart}</Tabs.Content>
        <Tabs.Content value="info">{info}</Tabs.Content>
        <Tabs.Content value="ai">{ai}</Tabs.Content>
      </div>
    </Tabs.Root>
  );
}

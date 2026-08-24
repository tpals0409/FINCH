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
 * 애플 분절 컨트롤로 만든 탭 줄.
 *
 * 트랙은 표면 한 단, 고른 칸은 승격면 + 1px 테두리 + 그림자다. 활성 칸을
 * **액센트 청으로 채우지 않는다.** 채우면 화면에 채워진 청색 사각이 둘 생기고,
 * 하나는 조작(주문 버튼)이고 하나는 표시라서 같은 색이 두 뜻을 갖는다.
 * 승격면 + 먹 글자로도 활성은 충분히 읽힌다.
 *
 * 승격면(#FBFBFD / #2C2C2E)을 쓰는 자리가 이 화면에서 여기와 기간 선택
 * 둘뿐이다. 둘 다 신호색 수치를 담지 않아, 다크 하락청의 승격면 대비
 * 미달(4.41:1)에 걸리지 않는다.
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
        className="flex gap-1 rounded-xl border border-border bg-surface p-1"
      >
        {STOCK_DETAIL_TABS.map((tab) => (
          <Tabs.Trigger
            key={tab}
            value={tab}
            /* 테두리를 활성일 때만 붙이면 1px 씩 밀린다. 투명 테두리를 항상 두고
               색만 바꾼다. */
            className="min-h-11 flex-1 rounded-lg border border-transparent text-note font-medium text-text-muted transition-colors duration-200 data-[state=active]:border-border data-[state=active]:bg-elevated data-[state=active]:font-semibold data-[state=active]:text-text data-[state=active]:shadow-card"
          >
            {TAB_LABEL[tab]}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* 탭 줄과 패널 사이 한 겹. 패널이 트랙에 붙으면 둘이 한 덩어리로 읽힌다. */}
      <div className="mt-3">
        <Tabs.Content value="chart">{chart}</Tabs.Content>
        <Tabs.Content value="info">{info}</Tabs.Content>
        <Tabs.Content value="ai">{ai}</Tabs.Content>
      </div>
    </Tabs.Root>
  );
}

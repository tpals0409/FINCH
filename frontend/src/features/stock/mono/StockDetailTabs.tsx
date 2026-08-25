// DIRECTION: mono (S15P21A101-95)

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
 * 분절 컨트롤로 만든 탭 줄.
 *
 * 트랙은 **눌린 면**이고 고른 칸만 그 안에서 떠오른다. 이 방향에서 상태를
 * 말하는 수단이 깊이다 — 눌려 있는 홈 안에서 하나가 올라와 있으면 무엇이
 * 선택됐는지 색 없이 읽힌다. 활성 칸을 색으로 채우지 않는 이유는 그것이다.
 * 채우면 화면에 채워진 면이 둘 생기고, 하나는 조작(주문 버튼)이라 뜻이 갈린다.
 *
 * 눌린 면의 대비는 보조 먹까지만 4.5:1 을 넘긴다 (라이트 4.56:1). 상승 적색은
 * 4.40:1 로 미달이므로 **눌린 면에 수치를 올리지 않는다.** 트랙은 레이블만 담는다.
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
      <Tabs.List aria-label="종목 상세 항목" className="mono-track">
        {STOCK_DETAIL_TABS.map((tab) => (
          <Tabs.Trigger key={tab} value={tab} className="mono-tab">
            {TAB_LABEL[tab]}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {/* 탭 줄과 패널 사이 한 겹. 패널이 트랙에 붙으면 둘이 한 덩어리로 읽힌다. */}
      <div style={{ marginTop: '0.75rem' }}>
        <Tabs.Content value="chart">{chart}</Tabs.Content>
        <Tabs.Content value="info">{info}</Tabs.Content>
        <Tabs.Content value="ai">{ai}</Tabs.Content>
      </div>
    </Tabs.Root>
  );
}

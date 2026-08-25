// DIRECTION: mono (S15P21A101-95)

import type { MockAnalysisOutcome } from '../api/getStockDetail';
import type { CandlePeriod, StockDetailTab } from '../model/stockDetail';

import type { MonoMockOverride } from './model/monoMock';
import { StockActionBar } from './StockActionBar';
import { StockAnalysisSlot } from './StockAnalysisSlot';
import { StockChartPanel } from './StockChartPanel';
import { StockDetailNav } from './StockDetailNav';
import { StockDetailTabs } from './StockDetailTabs';
import { StockHoldingBar } from './StockHoldingBar';
import { StockProfileList } from './StockProfileList';
import { StockQuoteHeader } from './StockQuoteHeader';

type StockDetailViewProps = {
  stockCode: string;
  tab: StockDetailTab;
  period: CandlePeriod;
  onTabChange: (tab: StockDetailTab) => void;
  onPeriodChange: (period: CandlePeriod) => void;
  mockAnalysisOutcome: MockAnalysisOutcome;
  /**
   * 목 전용. 92 의 목 데이터는 상태가 하나뿐이라 캐릭터의 세 포즈 중 하나만
   * 볼 수 있다. 92 의 목을 고칠 수 없어서 이쪽에서 덮는다.
   * MSW 핸들러가 들어오면 이 prop 은 사라진다.
   */
  mockPriceOverride: MonoMockOverride;
};

/**
 * 종목 상세 화면 한 장 — 모노 캐릭터 방향.
 *
 * 읽는 순서가 판단 순서다. 종목을 열고, 지금 얼마인지 한눈에 보고, 흐름을
 * 확인하고, 소견을 읽고, 살지 정한다. 캐릭터는 그 순서를 바꾸지 않는다.
 *
 * **캐릭터는 화면에 한 번만 나온다.** 표제부 오른쪽, 원래 비어 있던 자리다.
 * 여러 곳에 뿌리면 증권 화면이 장난감이 되고, 그건 사용자가 못박은 실패
 * 조건이다. 캐릭터가 이미 넥타이를 매고 있는데 화면이 놀이터면 안 된다.
 *
 * **깊이의 위계도 하나다.** 지면 위에 떠 있는 것은 카드·탭의 고른 칸·기간의
 * 고른 칸·주문 버튼뿐이고, 눌려 있는 것은 탭 트랙 하나다. 고정 요소(머리단·
 * 보유 줄·주문 바)는 지면의 일부로 두고 그림자를 주지 않는다 — 세 개가
 * 동시에 떠 있으면 화면에 떠 있는 판이 다섯이 되고 3D 가 무너진다.
 *
 * URL 상태(탭·기간)는 위에서 내려온다. 이 컴포넌트는 라우터를 모른다.
 */
export function StockDetailView({
  stockCode,
  tab,
  period,
  onTabChange,
  onPeriodChange,
  mockAnalysisOutcome,
  mockPriceOverride,
}: StockDetailViewProps) {
  return (
    <div className="mono-screen">
      <StockDetailNav stockCode={stockCode} />

      <div className="mono-scroll">
        <StockQuoteHeader
          stockCode={stockCode}
          mockOverride={mockPriceOverride}
        />

        <StockHoldingBar
          stockCode={stockCode}
          mockOverride={mockPriceOverride}
        />

        <div className="mono-stack">
          <StockDetailTabs
            value={tab}
            onValueChange={onTabChange}
            chart={
              <StockChartPanel
                stockCode={stockCode}
                period={period}
                onPeriodChange={onPeriodChange}
              />
            }
            info={<StockProfileList stockCode={stockCode} />}
            ai={
              <StockAnalysisSlot
                stockCode={stockCode}
                mockOutcome={mockAnalysisOutcome}
              />
            }
          />
        </div>
      </div>

      <StockActionBar stockCode={stockCode} />
    </div>
  );
}

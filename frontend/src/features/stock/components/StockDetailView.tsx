import type { MockAnalysisOutcome } from '../api/getStockDetail';
import type { CandlePeriod, StockDetailTab } from '../model/stockDetail';

import { StockActionBar } from './StockActionBar';
import { StockAnalysisSlot } from './StockAnalysisSlot';
import { StockChartPanel } from './StockChartPanel';
import { StockDetailNav } from './StockDetailNav';
import { StockDetailTabs } from './StockDetailTabs';
import { StockHoldingSummary } from './StockHoldingSummary';
import { StockProfileList } from './StockProfileList';
import { StockQuoteHeader } from './StockQuoteHeader';

type StockDetailViewProps = {
  stockCode: string;
  tab: StockDetailTab;
  period: CandlePeriod;
  onTabChange: (tab: StockDetailTab) => void;
  onPeriodChange: (period: CandlePeriod) => void;
  mockAnalysisOutcome: MockAnalysisOutcome;
};

/**
 * 종목 상세 화면 한 장.
 *
 * 읽는 순서가 판단 순서다. 종목을 열고, 지금 얼마인지 한눈에 보고, 흐름을
 * 확인하고, 소견을 읽고, 살지 정한다.
 *
 * **카드는 둘뿐이다** — 탭 패널과 내 보유. 표제부는 지면 위에 활자만 놓는다.
 * 카드를 하나 더 만들고 싶어지면 그건 대개 활자 크기로 풀 수 있는 위계를
 * 상자로 풀려는 것이다.
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
}: StockDetailViewProps) {
  return (
    <>
      <StockDetailNav stockCode={stockCode} />

      {/* 하단 고정 바 높이만큼 아래를 비운다. 없으면 마지막 카드가 바에 가린다. */}
      <div className="pb-28">
        <StockQuoteHeader stockCode={stockCode} />

        <div className="space-y-3 px-5">
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

          <StockHoldingSummary stockCode={stockCode} />
        </div>
      </div>

      <StockActionBar stockCode={stockCode} />
    </>
  );
}

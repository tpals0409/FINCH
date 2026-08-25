// DIRECTION: character (S15P21A101-93)

import type { MockAnalysisOutcome } from '../api/getStockDetail';
import type { CandlePeriod, StockDetailTab } from '../model/stockDetail';

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
};

/**
 * 종목 상세 화면 한 장 — 캐릭터 방향. props 는 애플 방향과 같다.
 *
 * 읽는 순서가 판단 순서다. 종목을 열고, 지금 얼마인지 한눈에 보고, 새가
 * 그 상황을 한 문장으로 요약해 주고, 흐름을 확인하고, 소견을 읽고, 살지 정한다.
 *
 * **새가 서는 자리는 둘뿐이다** — 표제부와 AI 슬롯. 머리단·보유 요약 줄·
 * 주문 바에는 두지 않는다. 그 셋은 스크롤 내내 화면에 고정되는 자리라,
 * 거기에 새를 넣으면 무엇을 보든 새가 따라다니게 되고 그때부터 캐릭터가
 * 분위기가 아니라 소음이 된다. 새는 지나가야 한다.
 *
 * **카드는 하나뿐이다** — 탭 패널. 표제부는 크림 지면 위에 활자와 새만 놓는다.
 * 카드를 하나 더 만들고 싶어지면 그건 대개 활자 크기로 풀 수 있는 위계를
 * 상자로 풀려는 것이다.
 *
 * 화면에 고정되는 것이 셋(머리단·보유 줄·주문 바)을 넘지 않게 한다 — 넘으면
 * 실제로 읽을 수 있는 지면이 없어진다.
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

        <StockHoldingBar stockCode={stockCode} />

        <div className="space-y-3 px-5 pt-3">
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
    </>
  );
}

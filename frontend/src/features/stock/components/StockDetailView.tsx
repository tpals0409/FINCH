import type { MockAnalysisOutcome } from '../api/getStockDetail';
import type { CandlePeriod, StockDetailTab } from '../model/stockDetail';

import { StockActionBar } from './StockActionBar';
import { StockAnalysisSlot } from './StockAnalysisSlot';
import { StockChartPanel } from './StockChartPanel';
import { StockDetailNav } from './StockDetailNav';
import { StockDetailTabs } from './StockDetailTabs';
import { StockHoldingBar } from './StockHoldingBar';
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
 * 보유 중이면 표제부와 탭 사이에 보유 요약 줄이 고정된다. 같은 값을 두 밀도로
 * 두는 셈인데, 위는 스크롤해도 남는 평가손익 하나고 아래 카드는 수량·평균
 * 단가까지 본다. 화면에 고정되는 것이 셋(머리단·보유 줄·주문 바)을 넘지
 * 않게 한다 — 넘으면 실제로 읽을 수 있는 지면이 없어진다.
 *
 * 고정 요소의 세로 배치가 곧 색의 배치다. 위쪽이 신호색 구역(현재가 등락과
 * 내 평가손익)이고 아래쪽이 액센트 구역(주문 버튼)이다. 두 청색이 위치로도
 * 갈린다 — 자세한 계산은 `StockActionBar` 주석에 있다.
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

          <StockHoldingSummary stockCode={stockCode} />
        </div>
      </div>

      <StockActionBar stockCode={stockCode} />
    </>
  );
}

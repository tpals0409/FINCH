import type { MockAnalysisOutcome } from '../api/getStockDetail';
import type { CandlePeriod, StockDetailTab } from '../model/stockDetail';

import { StockActionBar } from './StockActionBar';
import { StockAnalysisSlot } from './StockAnalysisSlot';
import { StockChartPlate } from './StockChartPlate';
import { StockDetailTabs } from './StockDetailTabs';
import { StockHoldingSummary } from './StockHoldingSummary';
import { StockMeasurements } from './StockMeasurements';
import { StockPlateTopBar } from './StockPlateTopBar';
import { StockProfileTable } from './StockProfileTable';
import { StockQuotePlate } from './StockQuotePlate';

type StockDetailPlateProps = {
  stockCode: string;
  tab: StockDetailTab;
  period: CandlePeriod;
  onTabChange: (tab: StockDetailTab) => void;
  onPeriodChange: (period: CandlePeriod) => void;
  mockAnalysisOutcome: MockAnalysisOutcome;
};

/**
 * 종목 상세 한 판(plate).
 *
 * 도감의 종 페이지 문법을 그대로 쓴다 — 학명 라벨, 표제 종명, 계측치, 도판, 소견.
 * 구획을 나누는 것은 1px 괘선뿐이고 그 괘선 격자가 곧 레이아웃이다.
 * **어떤 요소도 둥근 박스에 담기지 않는다.** 담는 순간 이 방향이 죽는다.
 *
 * 읽는 순서가 판단 순서다. 낯선 종목을 펼쳐 계측치를 읽고, 도판에서 흐름을 보고,
 * 소견을 읽고, 자기 보유를 확인하고, 살지 말지 정한다.
 *
 * URL 상태(탭·기간)는 위에서 내려온다. 이 컴포넌트는 라우터를 모른다.
 */
export function StockDetailPlate({
  stockCode,
  tab,
  period,
  onTabChange,
  onPeriodChange,
  mockAnalysisOutcome,
}: StockDetailPlateProps) {
  return (
    <>
      <StockPlateTopBar />

      <StockQuotePlate stockCode={stockCode} />

      <StockMeasurements stockCode={stockCode} />

      <StockDetailTabs
        value={tab}
        onValueChange={onTabChange}
        chart={
          <StockChartPlate
            stockCode={stockCode}
            period={period}
            onPeriodChange={onPeriodChange}
          />
        }
        info={<StockProfileTable stockCode={stockCode} />}
        ai={
          <StockAnalysisSlot
            stockCode={stockCode}
            mockOutcome={mockAnalysisOutcome}
          />
        }
      />

      <StockHoldingSummary stockCode={stockCode} />

      <StockActionBar stockCode={stockCode} />
    </>
  );
}

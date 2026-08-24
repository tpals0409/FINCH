import { formatKstDateTime } from '@/shared/lib/formatDate';
import { AiSlot, type AiSlotStatus } from '@/shared/ui/AiSlot';
import { SectionCard } from '@/shared/ui/SectionCard';
import { WidgetErrorBoundary } from '@/shared/ui/WidgetErrorBoundary';

import {
  StockAnalysisUnavailableError,
  type MockAnalysisOutcome,
} from '../api/getStockDetail';
import { useStockAnalysis } from '../api/useStockDetail';

type StockAnalysisSlotProps = {
  stockCode: string;
  /** 목 전용. 네 상태를 눈으로 확인할 수단이다. MSW 핸들러가 들어오면 사라진다. */
  mockOutcome: MockAnalysisOutcome;
};

/**
 * 종목 상세의 AI 소견 패널.
 *
 * 껍데기는 `shared/ui` 의 `AiSlot` 이고 이 컴포넌트는 그 안을 채운다.
 * 상태 판정은 정규화된 `code` 문자열로만 한다 — `message` 문장이나 상태 코드로
 * 분기하면 서버가 문구를 다듬는 순간 조용히 깨진다.
 *
 * `INSUFFICIENT_DATA` 는 실패가 아니라 자료가 모이지 않은 정상 상태다.
 * 같은 모양으로 그리면 사용자가 재시도 버튼을 계속 누른다.
 *
 * 본문 문장은 `text-body`(17px)로 둔다. AI 소견은 이 화면에서 유일하게 여러
 * 줄을 이어 읽는 곳이라, 지표 크기(15px)로 두면 문장이 표처럼 읽힌다.
 */
export function StockAnalysisSlot({
  stockCode,
  mockOutcome,
}: StockAnalysisSlotProps) {
  const { data, isPending, error, refetch } = useStockAnalysis(
    stockCode,
    mockOutcome,
  );

  const status: AiSlotStatus = isPending
    ? 'loading'
    : error instanceof StockAnalysisUnavailableError &&
        error.code === 'INSUFFICIENT_DATA'
      ? 'insufficient'
      : error !== null
        ? 'error'
        : 'ready';

  const footnoteParts = [
    data?.dataAsOf === undefined
      ? null
      : `${formatKstDateTime(data.dataAsOf)} 자료 기준`,
    data?.disclaimer ?? null,
  ].filter((part): part is string => part !== null);

  return (
    <SectionCard>
      <WidgetErrorBoundary label="AI 소견">
        <AiSlot
          status={status}
          label="AI 소견"
          message={error === null ? undefined : error.message}
          footnote={
            footnoteParts.length === 0 ? undefined : footnoteParts.join(' · ')
          }
          onRetry={() => void refetch()}
        >
          {data === undefined ? null : (
            <div>
              <p className="text-body font-medium text-text">{data.headline}</p>
              <div className="mt-5 space-y-4">
                {data.sections.map((section) => (
                  <div key={section.title}>
                    {/* 소제목이 레이블이고 본문이 내용이다. 본문을 보조 먹으로
                        두면 읽어야 할 쪽이 뒤로 물러난다 — 위계를 뒤집는다. */}
                    <h3 className="text-meta font-semibold text-text-muted">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-note leading-relaxed text-text">
                      {section.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </AiSlot>
      </WidgetErrorBoundary>
    </SectionCard>
  );
}

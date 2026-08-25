// DIRECTION: mono (S15P21A101-95)

import { formatKstDateTime } from '@/shared/lib/formatDate';
import { AiSlot, type AiSlotStatus } from '@/shared/ui/mono/AiSlot';
import { SectionCard } from '@/shared/ui/mono/SectionCard';
import { WidgetErrorBoundary } from '@/shared/ui/mono/WidgetErrorBoundary';

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
 * **이 슬롯은 껍데기다.** `analysis` 응답 타입이 아직 안 나왔다(GitLab #15,
 * `contracts.md` P8). 로딩·에러·자료 부족·본문 네 상태만 갖추고 구조를 채우려
 * 들지 않는다. 지금 본문 모양을 정해 두면 회신이 온 날 통째로 버리게 된다.
 *
 * 상태 판정은 정규화된 `code` 문자열로만 한다 — `message` 문장이나 상태 코드로
 * 분기하면 서버가 문구를 다듬는 순간 조용히 깨진다.
 *
 * 본문 문장은 본문 크기(17px)로 둔다. AI 소견은 이 화면에서 유일하게 여러
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
              <p className="mono-body mono-fg mono-strong">{data.headline}</p>
              <div className="mono-analysis-sections">
                {data.sections.map((section) => (
                  <div key={section.title}>
                    {/* 소제목이 레이블이고 본문이 내용이다. 본문을 보조 먹으로
                        두면 읽어야 할 쪽이 뒤로 물러난다 — 위계를 뒤집는다. */}
                    <h3 className="mono-meta mono-fg-muted mono-strong">
                      {section.title}
                    </h3>
                    <p
                      className="mono-note mono-fg"
                      style={{ marginTop: '0.25rem', lineHeight: 1.62 }}
                    >
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

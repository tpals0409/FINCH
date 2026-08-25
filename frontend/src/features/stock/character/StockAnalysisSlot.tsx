// DIRECTION: character (S15P21A101-93)

import { formatKstDateTime } from '@/shared/lib/formatDate';
import { AiSlot, type AiSlotStatus } from '@/shared/ui/character/AiSlot';
import { SectionCard } from '@/shared/ui/character/SectionCard';
import { WidgetErrorBoundary } from '@/shared/ui/character/WidgetErrorBoundary';

import {
  StockAnalysisUnavailableError,
  type MockAnalysisOutcome,
} from '../api/getStockDetail';
import { useStockAnalysis } from '../api/useStockDetail';

import { useFinchMood } from './useFinchMood';

type StockAnalysisSlotProps = {
  stockCode: string;
  /** 목 전용. 네 상태를 눈으로 확인할 수단이다. MSW 핸들러가 들어오면 사라진다. */
  mockOutcome: MockAnalysisOutcome;
};

/**
 * 종목 상세의 AI 소견 패널. props 는 애플 방향과 같다.
 *
 * 껍데기는 `shared/ui/character` 의 `AiSlot` 이고 이 컴포넌트는 그 안을 채운다.
 * **껍데기를 채우려 들지 않는다** — `analysis` 응답 타입이 아직 백엔드에서
 * 나오지 않았다 (GitLab #15, `contracts.md` P8). 지금 확정된 것은 네 상태
 * (로딩·에러·데이터 부족·본문)뿐이고 본문 구조는 회신이 오면 통째로 바뀐다.
 *
 * 상태 판정은 정규화된 `code` 문자열로만 한다 — `message` 문장이나 상태
 * 코드로 분기하면 서버가 문구를 다듬는 순간 조용히 깨진다.
 *
 * `INSUFFICIENT_DATA` 는 실패가 아니라 자료가 모이지 않은 정상 상태다.
 * 같은 모양으로 그리면 사용자가 재시도 버튼을 계속 누른다.
 *
 * 새의 색은 종목의 기분에서 오고, 포즈는 슬롯의 상태에서 온다. 두 축을
 * 여기서 합치지 않는다 — 색은 `useFinchMood` 가, 포즈는 `AiSlot` 이 정한다.
 */
export function StockAnalysisSlot({
  stockCode,
  mockOutcome,
}: StockAnalysisSlotProps) {
  const { data, isPending, error, refetch } = useStockAnalysis(
    stockCode,
    mockOutcome,
  );
  const bird = useFinchMood(stockCode);

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
          bird={bird}
          message={error === null ? undefined : error.message}
          footnote={
            footnoteParts.length === 0 ? undefined : footnoteParts.join(' · ')
          }
          onRetry={() => void refetch()}
        >
          {data === undefined ? null : (
            <div>
              <p className="text-[1.0625rem] leading-[1.47] font-medium break-keep text-[var(--character-text)]">
                {data.headline}
              </p>
              <div className="mt-5 space-y-4">
                {data.sections.map((section) => (
                  <div key={section.title}>
                    {/* 소제목이 레이블이고 본문이 내용이다. 본문을 보조 먹으로
                        두면 읽어야 할 쪽이 뒤로 물러난다 — 위계를 뒤집는다. */}
                    <h3 className="text-[0.8125rem] font-semibold text-[var(--character-text-muted)]">
                      {section.title}
                    </h3>
                    <p className="mt-1 text-[0.9375rem] leading-relaxed break-keep text-[var(--character-text)]">
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

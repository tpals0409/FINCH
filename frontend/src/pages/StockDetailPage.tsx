import { useSearchParams, useParams } from 'react-router-dom';

import {
  CandlePeriodSchema,
  StockDetailTabSchema,
  StockDetailView,
  type MockAnalysisOutcome,
} from '@/features/stock';

/** 목 AI 상태 강제. 개발 빌드에서만 읽는다. MSW 핸들러가 들어오면 사라진다. */
const MOCK_ANALYSIS_OUTCOMES: MockAnalysisOutcome[] = [
  'ready',
  'error',
  'insufficient',
];

/**
 * 종목 상세 화면.
 *
 * 이 페이지가 하는 일은 URL 을 읽고 도메인 컴포넌트에 넘기는 것뿐이다.
 * 탭과 차트 기간은 URL 쿼리 파라미터에 둔다 — 새로고침·공유·뒤로가기에서
 * 살아 있어야 하는 것은 전부 URL 상태다 (컨벤션 §4, IA §2).
 *
 * 데스크톱은 중앙 정렬 + 최대 너비 제한으로만 대응한다. 데스크톱 전용
 * 레이아웃을 따로 만들지 않는다 (컨벤션 §8).
 */
export function StockDetailPage() {
  const { stockCode } = useParams<{ stockCode: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // 종목코드는 6자리 문자열이다. 파라미터 이름이 어긋나면 조용히 undefined 가 된다.
  if (stockCode === undefined) {
    return (
      <main className="mx-auto w-full max-w-app px-5 py-20">
        <p className="text-body text-text">종목을 찾을 수 없습니다</p>
      </main>
    );
  }

  // 잘못된 값이 URL 에 실려 와도 화면이 깨지지 않게 스키마로 좁힌다.
  const tab = StockDetailTabSchema.catch('chart').parse(
    searchParams.get('tab'),
  );
  const period = CandlePeriodSchema.catch('3M').parse(
    searchParams.get('period'),
  );

  const mockAnalysisOutcome: MockAnalysisOutcome = import.meta.env.DEV
    ? (MOCK_ANALYSIS_OUTCOMES.find(
        (outcome) => outcome === searchParams.get('aiState'),
      ) ?? 'ready')
    : 'ready';

  const replaceParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    // 탭과 기간 전환은 이력에 쌓지 않는다. 쌓으면 뒤로가기를 여섯 번 눌러야
    // 이전 화면으로 나갈 수 있다.
    setSearchParams(next, { replace: true });
  };

  return (
    <main className="mx-auto w-full max-w-app">
      <StockDetailView
        stockCode={stockCode}
        tab={tab}
        period={period}
        onTabChange={(next) => replaceParam('tab', next)}
        onPeriodChange={(next) => replaceParam('period', next)}
        mockAnalysisOutcome={mockAnalysisOutcome}
      />
    </main>
  );
}

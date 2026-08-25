// DIRECTION: mono (S15P21A101-95)

import { useSearchParams, useParams } from 'react-router-dom';

import {
  CandlePeriodSchema,
  StockDetailTabSchema,
  type MockAnalysisOutcome,
} from '@/features/stock';
import {
  MOCK_PRICE_STATES,
  StockDetailView,
  type MockPriceState,
  type MonoMockOverride,
} from '@/features/stock/mono';

import '@/styles/mono.css';

/** 목 AI 상태 강제. 개발 빌드에서만 읽는다. MSW 핸들러가 들어오면 사라진다. */
const MOCK_ANALYSIS_OUTCOMES: MockAnalysisOutcome[] = [
  'ready',
  'error',
  'insufficient',
];

/**
 * 종목 상세 화면 — 모노 캐릭터 방향 (S15P21A101-95).
 *
 * 92(애플)·93(캐릭터)과 겨루는 세 번째 시안이고 셋 중 하나만 살아남는다.
 * 그래서 기존 화면을 고치지 않고 `/mono/stocks/:stockCode` 라는 경로를
 * 따로 판다. 이 방향이 탈락하면 이 파일과 함께 다음이 지워진다.
 *
 *   src/styles/mono.css
 *   src/shared/ui/mono/
 *   src/features/stock/mono/
 *   src/pages/MonoStockDetailPage.tsx
 *   public/character-mono/
 *   docs/assets/finch-character-mono-sheet.png
 *   docs/assets/finch-character-mono-cut.py
 *   app/router.tsx 의 DIRECTION:mono 구간
 *
 * 토큰도 이 방향 전용이다. `mono.css` 가 `@import 'tailwindcss'` 를 하지 않고
 * Tailwind 유틸리티도 쓰지 않는다 — 그것들은 92 의 `styles/index.css` 가
 * 만들어 내므로, 기대는 순간 92 를 지울 때 이 화면이 함께 죽는다.
 * 스타일시트를 여기서 import 하는 것도 같은 이유다. `main.tsx` 를 고치면
 * 92 의 파일에 이 방향의 흔적이 남는다.
 *
 * 이 페이지가 하는 일은 URL 을 읽고 도메인 컴포넌트에 넘기는 것뿐이다.
 * 탭과 차트 기간은 URL 쿼리 파라미터에 둔다 — 새로고침·공유·뒤로가기에서
 * 살아 있어야 하는 것은 전부 URL 상태다 (컨벤션 §4, IA §2).
 */
export function MonoStockDetailPage() {
  const { stockCode } = useParams<{ stockCode: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // 종목코드는 6자리 문자열이다. 파라미터 이름이 어긋나면 조용히 undefined 가 된다.
  if (stockCode === undefined) {
    return (
      <main className="mono-screen">
        <p className="mono-body mono-fg" style={{ padding: '5rem 1.25rem' }}>
          종목을 찾을 수 없습니다
        </p>
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

  /*
   * 캐릭터의 세 포즈를 눈으로 확인하기 위한 목 전용 스위치다.
   *
   *   (없음)                 92 의 목 그대로. 당일은 하락인데 평가손익은 이익인
   *                          어긋난 조합이고, 이때 캐릭터는 평가손익을 따른다
   *   ?state=rise|fall|flat  당일 등락과 평가손익의 부호를 맞춰 강제한다
   *   ?holding=none          미보유 화면. 캐릭터가 당일 등락을 본다
   *
   * 개발 빌드에서만 읽는다. MSW 핸들러가 들어오면 통째로 사라진다.
   */
  const mockPriceOverride: MonoMockOverride = import.meta.env.DEV
    ? {
        priceState: MOCK_PRICE_STATES.find(
          (state): state is MockPriceState =>
            state === searchParams.get('state'),
        ),
        hidesHolding: searchParams.get('holding') === 'none',
      }
    : { hidesHolding: false };

  const replaceParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    // 탭과 기간 전환은 이력에 쌓지 않는다. 쌓으면 뒤로가기를 여섯 번 눌러야
    // 이전 화면으로 나갈 수 있다.
    setSearchParams(next, { replace: true });
  };

  return (
    <main>
      <StockDetailView
        stockCode={stockCode}
        tab={tab}
        period={period}
        onTabChange={(next) => replaceParam('tab', next)}
        onPeriodChange={(next) => replaceParam('period', next)}
        mockAnalysisOutcome={mockAnalysisOutcome}
        mockPriceOverride={mockPriceOverride}
      />
    </main>
  );
}

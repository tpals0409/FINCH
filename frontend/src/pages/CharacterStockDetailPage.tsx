// DIRECTION: character (S15P21A101-93)

import { useSearchParams, useParams } from 'react-router-dom';

import {
  CandlePeriodSchema,
  StockDetailTabSchema,
  type MockAnalysisOutcome,
} from '@/features/stock';
import { StockDetailView } from '@/features/stock/character/StockDetailView';

import '@/styles/character.css';

/** 목 AI 상태 강제. 개발 빌드에서만 읽는다. MSW 핸들러가 들어오면 사라진다. */
const MOCK_ANALYSIS_OUTCOMES: MockAnalysisOutcome[] = [
  'ready',
  'error',
  'insufficient',
];

/**
 * 종목 상세 화면 — **캐릭터 방향 시안**.
 *
 * 애플 방향(`StockDetailPage`)과 같은 화면을 다른 디자인 언어로 한 번 더
 * 만든 것이다. 개선이 아니라 경쟁 시안이라, 둘을 나란히 띄워 놓고 하나를
 * 고르고 나머지를 버린다. 그래서 애플 방향 파일을 한 글자도 고치지 않고
 * 파일을 더하기만 했다. 이 방향이 탈락하면 아래 것들만 지우면 된다.
 *
 *   styles/character.css
 *   shared/ui/character/
 *   features/stock/character/
 *   pages/CharacterStockDetailPage.tsx
 *   public/character/
 *   app/router.tsx 의 `DIRECTION:character` 구간
 *
 * 토큰도 `--character-*` 로 전부 새로 만들어 애플 토큰을 한 번도 참조하지
 * 않는다. 값이 같아도 공유하지 않는다 — 한쪽을 지울 때 다른 쪽이 딸려 죽으면
 * 안 되기 때문이다.
 *
 * `character.css` 를 `main.tsx` 가 아니라 이 파일에서 불러온다. 그러면 방향이
 * 탈락했을 때 이 파일을 지우는 것만으로 스타일까지 함께 사라지고, 공용
 * 진입점에는 흔적이 남지 않는다.
 *
 * 이 페이지가 하는 일은 URL 을 읽고 도메인 컴포넌트에 넘기는 것뿐이다.
 * 탭과 차트 기간은 URL 쿼리 파라미터에 둔다 (컨벤션 §4, IA §2).
 */
export function CharacterStockDetailPage() {
  const { stockCode } = useParams<{ stockCode: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // 종목코드는 6자리 문자열이다. 파라미터 이름이 어긋나면 조용히 undefined 가 된다.
  if (stockCode === undefined) {
    return (
      <main className="character-page mx-auto w-full max-w-[28rem] px-5 py-20">
        <p className="text-[1.0625rem] text-[var(--character-text)]">
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

  const replaceParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    // 탭과 기간 전환은 이력에 쌓지 않는다. 쌓으면 뒤로가기를 여섯 번 눌러야
    // 이전 화면으로 나갈 수 있다.
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      {/* 지면을 뷰포트 전체에 깐다. 이 화면은 앱 한 폭(28rem)으로 가운데
          정렬되는데, 데스크톱에서 그 바깥이 공용 body 색으로 남으면 크림
          지면 옆에 흰(또는 검은) 띠가 생긴다. `index.css` 를 고치지 않고
          덮는 방법이 이것뿐이다. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-[var(--character-ground)]"
      />
      <main className="character-page mx-auto w-full max-w-[28rem]">
        <StockDetailView
          stockCode={stockCode}
          tab={tab}
          period={period}
          onTabChange={(next) => replaceParam('tab', next)}
          onPeriodChange={(next) => replaceParam('period', next)}
          mockAnalysisOutcome={mockAnalysisOutcome}
        />
      </main>
    </>
  );
}

import { createMockCandles } from '../lib/createMockCandles';
import {
  CandleSchema,
  StockAnalysisSchema,
  StockDetailSchema,
  StockProfileSchema,
  type Candle,
  type CandlePeriod,
  type StockAnalysis,
  type StockDetail,
  type StockProfile,
} from '../model/stockDetail';

/**
 * 종목 상세 목 데이터 공급자.
 *
 * **이 파일의 수치는 전부 지어낸 것이다.** 삼성전자(`005930`)라는 실제 종목의
 * 코드와 이름만 사실이고, 가격·거래량·지표·AI 소견 본문은 화면을 세우기 위해
 * 만든 자리표시자다. MSW 핸들러(0-11)가 아직 없어서 여기 하드코딩했다.
 *
 * 서로 맞아야 하는 값은 손으로 맞춰 두었다. 화면 안에서 어긋나면 리뷰에서
 * 바로 걸린다.
 *   changeAmount −900 = 73,500 − 74,400
 *   changeRate   −1.21 ≈ −900 / 74,400 × 100
 *   marketCap    438,779,017,425,000 = 5,969,782,550주 × 73,500원
 *   holding      12주 × (73,500 − 71,200) = 27,600원, 2,300 / 71,200 ≈ 3.23%
 *
 * MSW 가 들어오면 이 파일은 `httpClient` 호출 한 줄로 줄어든다. 스키마 검증과
 * 반환 타입은 그대로 두면 되도록 지금부터 같은 모양을 지킨다.
 */

const MOCK_AS_OF = '2026-08-24T14:30:00+09:00';
const MOCK_LAST_TRADING_DAY = '2026-08-24';

/** AI 응답은 실제로 느리다. 로딩 상태가 눈에 보이지 않으면 만들어도 검증할 수 없다. */
const MOCK_ANALYSIS_LATENCY_MS = 900;

const MOCK_STOCK_DETAIL: StockDetail = {
  stockCode: '005930',
  stockName: '삼성전자',
  market: 'KOSPI',
  currentPrice: 73_500,
  previousClose: 74_400,
  changeAmount: -900,
  changeRate: -1.21,
  suspended: false,
  suspendedReason: null,
  watched: false,
  asOf: MOCK_AS_OF,
  stale: false,
  holding: {
    quantity: 12,
    avgBuyPrice: 71_200,
    evaluationProfit: 27_600,
    evaluationProfitRate: 3.23,
  },
};

const MOCK_STOCK_PROFILE: StockProfile = {
  open: 74_200,
  high: 74_500,
  low: 73_100,
  volume: 12_345_678,
  tradingValue: 907_412_000_000,
  marketCap: 438_779_017_425_000,
  listedShares: 5_969_782_550,
  sector: '반도체와반도체장비',
  per: 12.4,
  pbr: 1.08,
  eps: 5_927,
  bps: 68_055,
  week52High: 88_800,
  week52Low: 49_900,
};

const MOCK_STOCK_ANALYSIS: StockAnalysis = {
  headline:
    '반도체 업황 회복 기대가 가격에 먼저 반영됐고, 지금은 실적이 그 기대를 따라오는지 확인하는 구간입니다.',
  sections: [
    {
      title: '지금 상태',
      body: '전일 대비 900원(-1.21%) 내렸습니다. 최근 20일 평균 거래량 수준에서 움직이고 있어, 특정 사건보다는 지수 흐름을 따라간 하락으로 보입니다.',
    },
    {
      title: '무엇이 달라졌나',
      body: '메모리 현물 가격이 3주 연속 올랐습니다. 다만 판가 인상이 분기 실적에 잡히기까지는 시차가 있어, 다음 실적 발표 전까지는 숫자로 확인되지 않습니다.',
    },
    {
      title: '내 보유에 미치는 영향',
      body: '평균단가 71,200원으로 12주를 보유하고 있어 아직 27,600원 이익 구간입니다. 오늘 하락은 평가손익을 27,600원까지 줄였지만 손실 전환까지는 주당 2,300원 여유가 있습니다.',
    },
    {
      title: '눈여겨볼 위험',
      body: '이 종목은 전체 지수 등락과 함께 움직이는 성향이 강합니다. 한 종목만 보고 판단하면 시장 전체 하락을 종목 문제로 오해할 수 있습니다.',
    },
  ],
  dataAsOf: MOCK_AS_OF,
  disclaimer:
    '투자 판단의 근거로 제공되며, 특정 종목의 매매를 권유하지 않습니다.',
};

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/** 목 응답도 스키마를 통과시킨다. 목이 스키마와 어긋나면 그건 목이 틀린 것이다. */
export async function getStockDetail(stockCode: string): Promise<StockDetail> {
  return StockDetailSchema.parse({ ...MOCK_STOCK_DETAIL, stockCode });
}

/**
 * 목을 가진 종목은 `005930` 하나뿐이다. 다른 코드로 들어와도 화면이 비지 않게
 * 같은 값을 돌려주지만, 그 화면의 수치는 그 종목의 것이 아니다.
 * MSW 핸들러가 들어오면 이 폴백이 사라지고 없는 종목은 `STOCK_NOT_FOUND` 가 된다.
 */
const MOCK_PROFILE_BY_STOCK_CODE: Record<string, StockProfile> = {
  '005930': MOCK_STOCK_PROFILE,
};

export async function getStockProfile(
  stockCode: string,
): Promise<StockProfile> {
  return StockProfileSchema.parse(
    MOCK_PROFILE_BY_STOCK_CODE[stockCode] ?? MOCK_STOCK_PROFILE,
  );
}

export async function getStockCandles(
  stockCode: string,
  period: CandlePeriod,
): Promise<Candle[]> {
  return CandleSchema.array().parse(
    createMockCandles(stockCode, period, MOCK_LAST_TRADING_DAY),
  );
}

/**
 * AI 분석은 네 상태를 갖는다 — 로딩·에러·데이터 부족·본문.
 * 목 단계에서 나머지 세 상태를 볼 방법이 없으면 만들어도 확인할 수 없으므로
 * 개발 빌드에서만 `outcome` 으로 강제할 수 있게 두었다.
 * 이 인자는 MSW 핸들러가 들어오면 사라진다.
 */
export type MockAnalysisOutcome = 'ready' | 'error' | 'insufficient';

export class StockAnalysisUnavailableError extends Error {
  /** 분기는 정규화된 `code` 문자열로만 한다 (컨벤션 §5). */
  readonly code: 'AI_UPSTREAM_ERROR' | 'INSUFFICIENT_DATA';

  constructor(
    code: 'AI_UPSTREAM_ERROR' | 'INSUFFICIENT_DATA',
    message: string,
  ) {
    super(message);
    this.name = 'StockAnalysisUnavailableError';
    this.code = code;
  }
}

export async function getStockAnalysis(
  _stockCode: string,
  outcome: MockAnalysisOutcome = 'ready',
): Promise<StockAnalysis> {
  await delay(MOCK_ANALYSIS_LATENCY_MS);

  if (outcome === 'error') {
    throw new StockAnalysisUnavailableError(
      'AI_UPSTREAM_ERROR',
      'AI 분석 서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.',
    );
  }

  if (outcome === 'insufficient') {
    throw new StockAnalysisUnavailableError(
      'INSUFFICIENT_DATA',
      '이 종목을 설명할 자료가 아직 모이지 않았습니다.',
    );
  }

  return StockAnalysisSchema.parse(MOCK_STOCK_ANALYSIS);
}

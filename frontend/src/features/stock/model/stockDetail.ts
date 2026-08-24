import { z } from 'zod';

/**
 * 종목 상세 화면이 다루는 도메인 모델.
 *
 * 스키마 출처는 `docs/api/apiSpec.md` §5.1~5.3 이다. 아직 목 데이터로 가는 단계라
 * HTTP 응답은 없지만, 목도 이 스키마를 통과시킨다. 그래야 나중에 실제 응답으로
 * 바꿀 때 어긋난 필드가 그 자리에서 드러난다.
 *
 * 단위 규약 (계약 C18, 크로스파트 계약 §1):
 * - 금액은 원 단위 정수
 * - **등락률·수익률은 백분율 값.** `-1.21` 이 -1.21% 다. 100 을 곱하지 않는다
 * - 종목코드는 6자리 문자열. 숫자로 다루면 앞자리 0 이 사라진다
 */

/** 6자리 숫자 문자열. 길이와 형태를 스키마가 지킨다. */
const StockCodeSchema = z
  .string()
  .regex(/^\d{6}$/, '종목코드는 6자리 숫자 문자열이다');

export const MarketSchema = z.enum(['KOSPI', 'KOSDAQ']);
export type Market = z.infer<typeof MarketSchema>;

export const HoldingSchema = z.object({
  quantity: z.number().int(),
  avgBuyPrice: z.number().int(),
  evaluationProfit: z.number().int(),
  /** 백분율 값 */
  evaluationProfitRate: z.number(),
});
export type Holding = z.infer<typeof HoldingSchema>;

export const StockDetailSchema = z.object({
  stockCode: StockCodeSchema,
  stockName: z.string().min(1),
  market: MarketSchema,
  currentPrice: z.number().int(),
  previousClose: z.number().int(),
  changeAmount: z.number().int(),
  /** 백분율 값 */
  changeRate: z.number(),
  suspended: z.boolean(),
  suspendedReason: z.string().nullable(),
  watched: z.boolean(),
  asOf: z.string(),
  /**
   * 시세 수신이 끊겼거나 캐시 미스면 `true` (계약 C42).
   * §5.2 종목 상세 응답에는 이 필드가 없고 §5.4·§5.5 시세 조회에만 있다.
   * 화면은 신선도를 표시해야 하므로 모델에 두되 optional 로 받는다.
   * 필수로 두면 실제 응답이 붙는 날 파싱이 통째로 실패한다.
   */
  stale: z.boolean().default(false),
  holding: HoldingSchema.nullable(),
});
export type StockDetail = z.infer<typeof StockDetailSchema>;

/**
 * 일중 계측치와 기업 지표.
 *
 * `GET /stocks/{stockCode}` 응답에는 이 필드들이 없다. 명세에 아직 대응
 * 엔드포인트가 없어서 화면이 필요한 값을 모아 별도 모델로 두었다.
 * 계약이 정해지면 이 스키마가 어느 응답에 실릴지 다시 배치한다.
 */
export const StockProfileSchema = z.object({
  open: z.number().int(),
  high: z.number().int(),
  low: z.number().int(),
  volume: z.number().int(),
  tradingValue: z.number().int(),
  marketCap: z.number().int(),
  listedShares: z.number().int(),
  sector: z.string(),
  per: z.number(),
  pbr: z.number(),
  eps: z.number().int(),
  bps: z.number().int(),
  week52High: z.number().int(),
  week52Low: z.number().int(),
});
export type StockProfile = z.infer<typeof StockProfileSchema>;

/** 일봉 한 개. `GET /stocks/{stockCode}/candles` §5.3 과 같은 형태다. */
export const CandleSchema = z.object({
  /** `YYYY-MM-DD` */
  date: z.string(),
  open: z.number().int(),
  high: z.number().int(),
  low: z.number().int(),
  close: z.number().int(),
  volume: z.number().int(),
});
export type Candle = z.infer<typeof CandleSchema>;

/** 차트 기간. `GET /candles` 의 `period` 와 같은 문자열이고 전부 일봉이다. */
export const CANDLE_PERIODS = ['1M', '3M', '1Y'] as const;
export const CandlePeriodSchema = z.enum(CANDLE_PERIODS);
export type CandlePeriod = z.infer<typeof CandlePeriodSchema>;

/** 종목 상세의 탭. URL 쿼리 파라미터 `tab` 에 실린다 (IA §2). */
export const STOCK_DETAIL_TABS = ['chart', 'info', 'ai'] as const;
export const StockDetailTabSchema = z.enum(STOCK_DETAIL_TABS);
export type StockDetailTab = z.infer<typeof StockDetailTabSchema>;

/**
 * AI 종목 분석 본문.
 *
 * **이 모양은 계약이 아니다.** `AnalysisSection` 의 키 구성이 미확정이고
 * (`contracts.md` P8), `openapi.json` 에 빈 object 로 떨어진다. 화면을 세우기
 * 위해 프론트가 임시로 정한 형태이므로 AI 파트 회신이 오면 통째로 교체한다.
 * 그래서 `AiSlot` 은 이 타입을 모른다 — 껍데기와 본문을 갈라 둔 이유가 이것이다.
 */
export const StockAnalysisSchema = z.object({
  headline: z.string(),
  sections: z.array(z.object({ title: z.string(), body: z.string() })),
  /** 봉투 필드는 백엔드 중계 후에도 남는지 확인되지 않았다 (P4). optional 로 받는다. */
  dataAsOf: z.string().optional(),
  disclaimer: z.string().optional(),
});
export type StockAnalysis = z.infer<typeof StockAnalysisSchema>;

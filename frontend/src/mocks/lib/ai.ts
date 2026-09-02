import { nowKstIso } from './time';

/**
 * AI 중계 응답의 공통 조각 (apiSpec §10.3 · AI 명세 §2.2 · contracts C7·C53~C56).
 *
 * ## 가정 하나 — (가) 평탄화
 *
 * 백엔드가 AI 봉투를 벗기고 `content` 안의 키를 **본문 최상위로 올린다**고 읽었다.
 * 아래 `aiResponse()` 가 그 가정을 구현한 유일한 자리이고,
 * `shared/types/ai/envelope.ts` 의 `createAiResponseSchema()` 도 같은 가정으로 짜여 있다.
 *
 * **이 독법은 아직 확정이 아니다 — GitLab 이슈 #22 로 물어 뒀다.**
 * 회신이 `content` 유지로 오면 **이 함수 하나만 고친다.** 각 핸들러의 본문 픽스처는 그대로다.
 *
 * `generatedAt`·`model`·`cached` 는 재포장 후에도 남는지 확인되지 않았다 (contracts P4).
 * 남는 쪽으로 실어 둔다 — 스키마가 `.optional()` 이라 빠져도 통과하므로, 실어 두는 편이
 * "왔을 때 무시하는" 처리를 화면에서 확인할 수 있다.
 */

/** `citations[]` 한 건 (AI 명세 §2.4). `type: 'engine'` 은 자체 계산이라 `url` 이 없다. */
export const MOCK_CITATIONS = [
  {
    id: 'cit_1',
    type: 'filing',
    title: '삼성전자 반기보고서 (2026.06)',
    source: 'DART',
    publisher: '금융감독원',
    url: 'https://dart.fss.or.kr/',
    publishedAt: '2026-08-14T09:00:00+09:00',
    snippet: '반도체 부문 영업이익이 전 분기 대비 증가했다.',
    /** 0~1 소수다. 등락률 계열이 아니다 */
    relevance: 0.92,
  },
  {
    id: 'cit_2',
    type: 'engine',
    title: '집중도 지표 계산 결과',
    source: 'risk_engine',
    publisher: null,
    url: null,
    publishedAt: null,
    snippet: null,
    relevance: 0.75,
  },
];

const DISCLAIMER =
  '이 정보는 투자 참고용이며 투자 권유가 아닙니다. 투자 판단과 책임은 본인에게 있습니다.';

let requestSequence = 0;

/** 응답마다 다른 `requestId`. 피드백 슬롯이 이 값으로 원본 응답을 찾는다 (contracts C14). */
export function nextAiRequestId(): string {
  requestSequence += 1;
  return `req_mock_${String(requestSequence).padStart(4, '0')}`;
}

/**
 * 본문에 보존 필드를 얹는다. **(가) 평탄화 가정이 이 함수에 갇혀 있다.**
 * 이슈 #22 답이 오면 여기를 고친다.
 */
export function aiResponse<TContent extends object>(
  content: TContent,
  requestId: string,
  dataAsOf?: Partial<{
    price: string | null;
    portfolio: string | null;
    filings: string | null;
    news: string | null;
    macro: string | null;
  }>,
) {
  return {
    ...content,
    requestId,
    dataAsOf: {
      price: null,
      portfolio: null,
      filings: null,
      news: null,
      macro: null,
      ...dataAsOf,
    },
    citations: MOCK_CITATIONS,
    disclaimer: DISCLAIMER,
    generatedAt: nowKstIso(),
    model: 'mock-llm-1',
    /** 캐시 계층이 없어 항상 false 다 (contracts C56) */
    cached: false,
  };
}

/**
 * 문장 조각 (AI 명세 §2.3 · §12). `text` 조각에도 여섯 키가 전부 실린다.
 * `direction` 은 상승 적색·하락 청색의 근거이므로 목에 `up`·`down` 이 모두 들어 있어야 한다.
 */
export function textSegment(value: string) {
  return {
    type: 'text' as const,
    value,
    raw: null,
    unit: null,
    source: null,
    direction: null,
  };
}

export function metricSegment(
  value: string,
  raw: number,
  unit: string,
  source: string,
  direction: 'up' | 'down' | null,
) {
  return { type: 'metric' as const, value, raw, unit, source, direction };
}

/** 서술 한 덩어리 (AI 명세 §12 Section). `cached` 는 항상 false 다 (contracts C56). */
export function section(
  title: string | null,
  text: string,
  segments: ReturnType<typeof textSegment | typeof metricSegment>[],
) {
  return { title, text, segments, cached: false, cachedAt: null };
}

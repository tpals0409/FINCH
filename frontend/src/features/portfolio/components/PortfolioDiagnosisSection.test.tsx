import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from '@/shared/api';
import type { AiAttributionResponse } from '@/shared/types/ai/attribution';
import type { AiDiagnosisResponse } from '@/shared/types/ai/diagnosis';
import { RatioSchema } from '@/shared/types/primitives';

import { usePortfolioAttribution } from '../api/usePortfolioAttribution';
import { usePortfolioDiagnosis } from '../api/usePortfolioDiagnosis';

import { PortfolioDiagnosisSection } from './PortfolioDiagnosisSection';

vi.mock('../api/usePortfolioAttribution', () => ({
  usePortfolioAttribution: vi.fn(),
}));
vi.mock('../api/usePortfolioDiagnosis', () => ({
  usePortfolioDiagnosis: vi.fn(),
}));

const mutationDefaults = {
  error: null,
  isPending: false,
  reset: vi.fn(),
  mutateAsync: vi.fn(),
};

function renderSection(
  diagnosisData?: AiDiagnosisResponse,
  diagnosisError: unknown = null,
) {
  vi.mocked(usePortfolioDiagnosis).mockReturnValue({
    ...mutationDefaults,
    data: diagnosisData,
    error: diagnosisError,
  } as never);
  vi.mocked(usePortfolioAttribution).mockReturnValue({
    ...mutationDefaults,
    data: undefined,
  } as never);
  return renderToStaticMarkup(<PortfolioDiagnosisSection />);
}

function diagnosisWithNullIndicators(): AiDiagnosisResponse {
  return {
    content: {
      riskLevel: null,
      riskScore: null,
      insufficientHistory: '거래 이력이 아직 충분하지 않아요.',
      summary: null,
      findings: [],
      indicators: {
        hhi: null,
        top1Weight: null,
        top3Weight: null,
        sectorHhi: null,
        annualizedVolatility: null,
        maxDrawdown1y: null,
        cashRatio: null,
        beta: null,
        largeCapWeight: null,
        diversificationRatio: null,
        rateSensitivity: null,
      },
    },
    requestId: 'req_test',
    dataAsOf: {
      price: null,
      portfolio: null,
      filings: null,
      news: null,
      macro: null,
    },
    citations: [],
    disclaimer: '테스트 안내',
  } as AiDiagnosisResponse;
}

describe('PortfolioDiagnosisSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('계산할 수 없는 지표와 insufficient history를 안내한다', () => {
    const html = renderSection(diagnosisWithNullIndicators());

    expect(html).toContain('거래 이력이 아직 충분하지 않아요.');
    expect(html.match(/—/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('보유 종목 없음 오류를 진단 안내로 바꾼다', () => {
    const error = new HttpError({
      status: 409,
      code: 'INSUFFICIENT_DATA',
      message: '진단할 포트폴리오가 없습니다',
    });

    const html = renderSection(undefined, error);

    expect(html).toContain('담은 종목이 없어요');
    expect(html).toContain('포트폴리오 진단을 받을 수 있어요');
  });

  it('진단 결과와 전체 기간 기여 종목을 표시한다', () => {
    const diagnosis = diagnosisWithNullIndicators();
    diagnosis.content.riskLevel = 'moderate';
    diagnosis.content.riskScore = 62;
    diagnosis.content.indicators.annualizedVolatility =
      RatioSchema.parse(0.2841);
    diagnosis.content.indicators.diversificationRatio = 1.08;
    diagnosis.content.indicators.maxDrawdown1y = RatioSchema.parse(-0.2214);
    diagnosis.content.indicators.rateSensitivity = 'moderate';

    const attribution = {
      content: {
        summary: null,
        contributors: [
          {
            ticker: '005930',
            name: '삼성전자',
            contribution: 0.0123,
          },
        ],
        detractors: [],
      },
    } as unknown as AiAttributionResponse;
    vi.mocked(usePortfolioDiagnosis).mockReturnValue({
      ...mutationDefaults,
      data: diagnosis,
    } as never);
    vi.mocked(usePortfolioAttribution).mockReturnValue({
      ...mutationDefaults,
      data: attribution,
    } as never);

    const html = renderToStaticMarkup(<PortfolioDiagnosisSection />);

    expect(html).toContain('보통');
    expect(html).toContain('28.41%');
    expect(html).toContain('삼성전자');
    expect(html).toContain('+1.23%');
  });
});

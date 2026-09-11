import { useCallback } from 'react';

import { isHttpError } from '@/shared/api';
import { formatSignedRatioAsPercent } from '@/shared/lib/formatNumber';
import type { AiAttributionContent } from '@/shared/types/ai/attribution';
import type { AiDiagnosisContent } from '@/shared/types/ai/diagnosis';
import { AI_SERVICE_ERROR_CODES } from '@/shared/types/errorCodes';
import { RatioSchema } from '@/shared/types/primitives';
import { AiSectionText } from '@/shared/ui/AiSectionText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SupportingText } from '@/shared/ui/SupportingText';

import { usePortfolioAttribution } from '../api/usePortfolioAttribution';
import { usePortfolioDiagnosis } from '../api/usePortfolioDiagnosis';

const RISK_LABEL: Record<
  NonNullable<AiDiagnosisContent['riskLevel']>,
  string
> = {
  low: '낮음',
  moderate: '보통',
  high: '높음',
};

function formatRatio(value: number | null) {
  return value === null
    ? '—'
    : formatSignedRatioAsPercent(RatioSchema.parse(value));
}

function formatMultiple(value: number | null) {
  return value === null ? '—' : `${value.toFixed(2)}배`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stroke-neutral-subtle bg-bg-layer-default p-3">
      <SupportingText size="caption">{label}</SupportingText>
      <p className="mt-1 text-title-3 text-fg-neutral tabular-nums">{value}</p>
    </div>
  );
}

function DiagnosisResult({ content }: { content: AiDiagnosisContent }) {
  const { indicators } = content;
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-2" aria-label="포트폴리오 진단 지표">
        <Metric
          label="위험등급"
          value={
            content.riskLevel === null ? '—' : RISK_LABEL[content.riskLevel]
          }
        />
        <Metric
          label="연환산 변동성"
          value={formatRatio(indicators.annualizedVolatility)}
        />
        <Metric
          label="분산비율"
          value={formatMultiple(indicators.diversificationRatio)}
        />
        <Metric
          label="최대낙폭"
          value={formatRatio(indicators.maxDrawdown1y)}
        />
        <Metric label="금리민감도" value={indicators.rateSensitivity ?? '—'} />
      </div>

      {content.riskScore !== null ? (
        <SupportingText as="p" size="caption">
          위험점수 {content.riskScore}/100
        </SupportingText>
      ) : null}

      {content.insufficientHistory !== null ? (
        <SupportingText as="p" size="caption">
          {content.insufficientHistory}
        </SupportingText>
      ) : null}

      {content.summary !== null ? (
        <div>
          <h3 className="text-label text-fg-neutral">
            {content.summary.title ?? '진단 요약'}
          </h3>
          <AiSectionText
            text={content.summary.text}
            segments={content.summary.segments}
            className="mt-1"
          />
        </div>
      ) : null}

      {content.findings.length > 0 ? (
        <div>
          <h3 className="text-label text-fg-neutral">발견사항</h3>
          <ul className="mt-2 space-y-2">
            {content.findings.map((finding) => (
              <li
                key={finding.id}
                className="border-t border-stroke-neutral-subtle pt-2"
              >
                <p className="text-body-2 text-fg-neutral">{finding.title}</p>
                {finding.text !== null ? (
                  <p className="mt-1 text-caption text-fg-neutral-subtle">
                    {finding.text}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AttributionResult({ content }: { content: AiAttributionContent }) {
  const rows = [...content.contributors, ...content.detractors]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 5);

  return (
    <div className="mt-4">
      <h3 className="text-label text-fg-neutral">전체 기간 기여도</h3>
      {content.summary !== null ? (
        <AiSectionText
          text={content.summary.text}
          segments={content.summary.segments}
          className="mt-1"
        />
      ) : null}
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.ticker}
            className="flex items-center justify-between border-t border-stroke-neutral-subtle pt-2"
          >
            <span className="text-body-2 text-fg-neutral">{row.name}</span>
            <span className="text-body-2 text-fg-neutral tabular-nums">
              {formatSignedRatioAsPercent(RatioSchema.parse(row.contribution))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function isInsufficientData(error: unknown) {
  return (
    isHttpError(error) &&
    error.code === AI_SERVICE_ERROR_CODES.INSUFFICIENT_DATA
  );
}

export function PortfolioDiagnosisSection() {
  const diagnosis = usePortfolioDiagnosis();
  const attribution = usePortfolioAttribution();
  const isPending = diagnosis.isPending || attribution.isPending;
  const hasInsufficientData =
    isInsufficientData(diagnosis.error) ||
    isInsufficientData(attribution.error);

  const runDiagnosis = useCallback(() => {
    diagnosis.reset();
    attribution.reset();
    void Promise.allSettled([
      diagnosis.mutateAsync(),
      attribution.mutateAsync({ period: 'all' }),
    ]);
  }, [attribution, diagnosis]);

  return (
    <section className="mt-6" aria-labelledby="portfolio-diagnosis-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="portfolio-diagnosis-heading"
            className="text-title-3 text-fg-neutral"
          >
            포트폴리오 진단
          </h2>
          <SupportingText size="caption" className="mt-1">
            내 투자 상태와 수익률 원인을 확인해요
          </SupportingText>
        </div>
        <Button
          onClick={runDiagnosis}
          disabled={isPending}
          className="w-auto shrink-0 px-3"
        >
          {isPending ? '분석 중…' : '진단받기'}
        </Button>
      </div>

      {hasInsufficientData ? (
        <Card className="mt-3">
          <p className="text-body-1 text-fg-neutral">담은 종목이 없어요</p>
          <SupportingText size="caption" className="mt-1">
            종목을 담으면 포트폴리오 진단을 받을 수 있어요
          </SupportingText>
        </Card>
      ) : null}

      {diagnosis.data !== undefined ? (
        <Card className="mt-3">
          <DiagnosisResult content={diagnosis.data.content} />
          {attribution.data !== undefined ? (
            <AttributionResult content={attribution.data.content} />
          ) : null}
        </Card>
      ) : null}

      {diagnosis.error !== null && !hasInsufficientData ? (
        <SupportingText as="p" role="alert" className="mt-3">
          진단을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </SupportingText>
      ) : null}
      {attribution.error !== null && diagnosis.data !== undefined ? (
        <SupportingText as="p" role="alert" className="mt-3">
          수익률 기여도를 불러오지 못했어요.
        </SupportingText>
      ) : null}
    </section>
  );
}

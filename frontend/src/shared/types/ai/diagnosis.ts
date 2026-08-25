import { z } from 'zod';

import { RatioSchema } from '@/shared/types/primitives';

import {
  AiSectionSchema,
  AiSegmentSchema,
  createAiResponseSchema,
} from './envelope';

/**
 * 포트폴리오 진단 (`ai/docs/api-spec.md` §5 포트폴리오 진단, `POST /ai/portfolio/diagnosis`).
 *
 * 지표는 Risk Engine 이, 문장은 LLM 이 만든다. 프론트는 완성된 응답을 그대로 출력한다(C53).
 *
 * **여기 비율은 전부 0~1 소수다.** 등락률 계열이 아니다 — `top1Weight: 0.4168` 은 41.68% 이고
 * 화면에서 100 을 곱한다. `beta`·`diversificationRatio` 는 비율이 아니라 배수라
 * `RatioSchema` 를 쓰지 않는다.
 *
 * 키 이름은 백엔드가 `camelCase` 로 재포장한 결과를 가정한 것이다(C7). 숫자가 섞인
 * `top1Weight`·`maxDrawdown1y` 는 변환 규칙만으로 정해지지 않아 **잠정이다**(contracts T2).
 * 회신이 오면 이 디렉토리만 고친다.
 */

/** 위험 등급 (AI 명세 §5). 규칙 엔진 판정이고 LLM 이 정하지 않는다. 보류하면 `null` 이다. */
export const AiRiskLevelSchema = z.enum(['low', 'moderate', 'high']);
export type AiRiskLevel = z.infer<typeof AiRiskLevelSchema>;

/** `findings[].severity` (AI 명세 §5). 배열 정렬 순서가 곧 중요도 순위다. */
export const AiFindingSeveritySchema = z.enum(['info', 'medium', 'high']);
export type AiFindingSeverity = z.infer<typeof AiFindingSeveritySchema>;

/** `findings[].id` 의 확인된 값 (AI 명세 §5). 걸린 항목만 배열에 담긴다. */
export const AI_FINDING_IDS = [
  'ticker_concentration',
  'sector_concentration',
  'volatility',
  'correlation',
  'liquidity',
  'macro_exposure',
] as const;
export type AiFindingId = (typeof AI_FINDING_IDS)[number];

/** `findings[].category` 의 확인된 값 (AI 명세 §5). 국가 집중도·통화 노출은 정의되지 않았다. */
export const AI_FINDING_CATEGORIES = [
  'concentration',
  'volatility',
  'correlation',
  'style_tilt',
  'macro_exposure',
  'liquidity',
] as const;
export type AiFindingCategory = (typeof AI_FINDING_CATEGORIES)[number];

/**
 * `findings[].evidence` (AI 명세 §5).
 *
 * **스키마를 굳히지 않았다.** 고정 키 다섯(`tickers·metric·value·threshold·hhi`) 밖에
 * `id` 값에 따라 `avgPairwiseCorr`·`sector`·`rateSensitivity` 가 조건부로 더 붙고,
 * contracts P2 도 이 자리를 "자유 형식"으로 적고 있다. 게다가 이 값은 LLM 입력을 되비추는
 * 디버깅·평가용이라 화면이 읽지 않는다. 억지로 형태를 정하면 조건부 키 하나에 파싱이 죽는다.
 */
export const AiFindingEvidenceSchema = z.looseObject({});
export type AiFindingEvidence = z.infer<typeof AiFindingEvidenceSchema>;

/**
 * 진단 항목 하나 (AI 명세 §5).
 * `text`·`segments` 는 Section 전체가 아니라 **이 두 키만 펼쳐 담는다.**
 * 문장 생성이 막히면 둘 다 `null` 이고 지표는 그대로 나간다.
 */
export const AiFindingSchema = z.object({
  id: z.string(),
  category: z.string(),
  severity: AiFindingSeveritySchema,
  title: z.string(),
  text: z.string().nullable(),
  segments: z.array(AiSegmentSchema).nullable(),
  evidence: AiFindingEvidenceSchema,
});
export type AiFinding = z.infer<typeof AiFindingSchema>;

/**
 * 숫자로만 이뤄진 위험 지표 (AI 명세 §5 `indicators`).
 * 열한 키는 항상 실려 나오고 **계산되지 않은 지표는 0 이 아니라 `null`** 이다.
 * 공통 거래일이 60일에 못 미치면 `annualizedVolatility`·`diversificationRatio` 가 `null` 이
 * 되지만 집중도·현금 비중은 유효하므로 **409 로 끊지 않는다.**
 */
export const AiNumericIndicatorsSchema = z.object({
  /** 허핀달 지수. 0~1 */
  hhi: RatioSchema.nullable(),
  top1Weight: RatioSchema.nullable(),
  top3Weight: RatioSchema.nullable(),
  sectorHhi: RatioSchema.nullable(),
  annualizedVolatility: RatioSchema.nullable(),
  /** 최대 낙폭. 음수로 온다 (`-0.2214`) */
  maxDrawdown1y: RatioSchema.nullable(),
  cashRatio: RatioSchema.nullable(),
  /** 배수다. 비율이 아니다 */
  beta: z.number().nullable(),
  largeCapWeight: RatioSchema.nullable(),
  /** 배수다. 비율이 아니다 */
  diversificationRatio: z.number().nullable(),
});
export type AiNumericIndicators = z.infer<typeof AiNumericIndicatorsSchema>;

/** `indicators` 전체. 숫자 지표에 문자열 지표 `rateSensitivity` 가 더해진 열한 키다. */
export const AiIndicatorsSchema = AiNumericIndicatorsSchema.extend({
  rateSensitivity: z.string().nullable(),
});
export type AiIndicators = z.infer<typeof AiIndicatorsSchema>;

/** 포트폴리오 진단 본문 (AI 명세 §5 Response — content). */
export const AiDiagnosisContentSchema = z.object({
  riskLevel: AiRiskLevelSchema.nullable(),
  /** 0~100 정수. 판정 보류 시 `null` */
  riskScore: z.number().int().min(0).max(100).nullable(),
  /** 변동성·상관을 계산하지 못한 사유. 정상일 때 `null` */
  insufficientHistory: z.string().nullable(),
  /** 문장 생성이 막히면 `null` 이고 지표는 그대로 나간다 */
  summary: AiSectionSchema.nullable(),
  findings: z.array(AiFindingSchema),
  indicators: AiIndicatorsSchema,
});
export type AiDiagnosisContent = z.infer<typeof AiDiagnosisContentSchema>;

/**
 * `POST /ai/portfolio/diagnosis` 는 요청 본문이 정의돼 있지 않다 (AI 명세 §5).
 * 사용자 식별은 헤더로만 하므로 본문에 넣을 것이 없다(C25). 요청 스키마를 만들지 않는다.
 *
 * 보유 종목이 0개면 `409 INSUFFICIENT_DATA` 가 온다. **에러가 아니라 정상적인 거절이다**(C12) —
 * AI 영역만 대체 문구로 접고 화면 전체를 실패로 만들지 않는다.
 */

/** POST /ai/portfolio/diagnosis 응답. 본문에 보존 필드가 함께 실린다 (apiSpec §10.3). */
export const AiDiagnosisResponseSchema = createAiResponseSchema(
  AiDiagnosisContentSchema,
);
export type AiDiagnosisResponse = z.infer<typeof AiDiagnosisResponseSchema>;

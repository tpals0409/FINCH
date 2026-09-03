import { z } from 'zod';

import { RatioSchema } from '@/shared/types/primitives';

/**
 * 배선 확인용 스키마. 실제 도메인이 붙으면 이 feature 는 통째로 지운다.
 * 비율은 0~1 소수(`Ratio`), 금액은 원 단위 정수, 시각은 ISO 8601 이다 (컨벤션 §6).
 * `sampleChangeRatio`는 등락률(`Percent`)이 아니라 0~1 소수 비율이라 `formatSignedRatioAsPercent`로
 * 그린다 — `RatioSchema`로 브랜딩해 잘못된 포매터를 넘기면 컴파일이 막힌다.
 */
export const HealthStatusSchema = z.object({
  status: z.union([z.literal('ok'), z.literal('degraded')]),
  serverTime: z.iso.datetime(),
  sampleIndexValue: z.number().int(),
  sampleChangeRatio: RatioSchema,
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

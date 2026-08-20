import { z } from 'zod';

/**
 * 배선 확인용 스키마. 실제 도메인이 붙으면 이 feature 는 통째로 지운다.
 * 비율은 0~1 소수, 금액은 원 단위 정수, 시각은 ISO 8601 이다 (컨벤션 §6).
 */
export const HealthStatusSchema = z.object({
  status: z.union([z.literal('ok'), z.literal('degraded')]),
  serverTime: z.iso.datetime(),
  sampleIndexValue: z.number().int(),
  sampleChangeRatio: z.number(),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

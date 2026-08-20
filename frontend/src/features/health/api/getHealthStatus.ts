import { request } from '@/shared/api';

import { HealthStatusSchema, type HealthStatus } from '../model/health';

export function getHealthStatus(signal?: AbortSignal): Promise<HealthStatus> {
  return request('/health', { schema: HealthStatusSchema, signal });
}

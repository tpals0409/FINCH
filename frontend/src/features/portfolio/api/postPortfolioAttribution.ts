import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiAttributionRequestSchema,
  AiAttributionResponseSchema,
  type AiAttributionRequest,
} from '@/shared/types/ai/attribution';

/** 전체 보유 기간의 수익률 기여도를 요청한다. */
export function postPortfolioAttribution(body: AiAttributionRequest) {
  const validatedBody = AiAttributionRequestSchema.parse(body);
  return request(API_PATHS.ai.attribution, {
    method: 'POST',
    body: validatedBody,
    schema: AiAttributionResponseSchema,
  });
}

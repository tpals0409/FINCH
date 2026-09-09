import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  PortfolioResponseSchema,
  type PortfolioResponse,
} from '@/shared/types/portfolio';

export function getPortfolio(signal?: AbortSignal): Promise<PortfolioResponse> {
  return request(API_PATHS.portfolio, {
    schema: PortfolioResponseSchema,
    signal,
  });
}

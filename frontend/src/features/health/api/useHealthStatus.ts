import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getHealthStatus } from './getHealthStatus';

export function useHealthStatus() {
  return useQuery({
    queryKey: queryKeys.health.status(),
    queryFn: ({ signal }) => getHealthStatus(signal),
    staleTime: 0,
  });
}

import { useQuery } from '@tanstack/react-query';

import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';
import { AiBriefingResponseSchema } from '@/shared/types/ai/briefing';

/**
 * 데일리 브리핑 (`GET /ai/briefing`). **AI 중계 가운데 유일한 GET 이다** (contracts C3).
 *
 * `status: 'empty'` 는 오류가 아니다 — 보유 종목이 없으면 정상적으로 비어 온다.
 * 화면이 그 갈래를 에러로 다루면 신규 가입자에게 고장난 화면이 보인다.
 *
 * 재시도를 기본값에 맡긴다. 브리핑은 조회일 뿐이라 두 번 불러도 아무것도 바뀌지 않는다.
 */
export function useAiBriefing(date: string | null = null) {
  return useQuery({
    queryKey: queryKeys.ai.briefing(date),
    queryFn: ({ signal }) =>
      request(
        date === null
          ? API_PATHS.ai.briefing
          : `${API_PATHS.ai.briefing}?date=${date}`,
        { schema: AiBriefingResponseSchema, signal },
      ),
  });
}

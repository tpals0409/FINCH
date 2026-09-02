import { http, HttpResponse } from 'msw';

/**
 * 스모크 테스트용 `/health` (`features/health`). API 계약에 있는 경로가 아니라
 * 목 서버가 살아 있는지 확인하는 자리다. `handlers.ts` 에 있던 것을 그대로 옮겼다.
 */
export const healthHandlers = [
  http.get('*/health', () =>
    HttpResponse.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      sampleIndexValue: 2734,
      sampleChangeRatio: 0.0123,
    }),
  ),
];

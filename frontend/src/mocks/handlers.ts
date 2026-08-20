import { http, HttpResponse } from 'msw';

/**
 * MSW 핸들러. 이 디렉토리의 코드는 프로덕션 번들에 들어가면 안 되므로
 * app 진입점의 개발 전용 동적 import 로만 불러온다 (컨벤션 §2).
 */
export const handlers = [
  http.get('*/health', () =>
    HttpResponse.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      sampleIndexValue: 2734,
      sampleChangeRatio: 0.0123,
    }),
  ),
];

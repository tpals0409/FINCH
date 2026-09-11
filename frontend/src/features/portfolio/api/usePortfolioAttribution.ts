import { useMutation } from '@tanstack/react-query';

import { postPortfolioAttribution } from './postPortfolioAttribution';

/** 버튼으로 실행하는 전체 기간 기여도 분석. AI 요청은 자동 재시도하지 않는다. */
export function usePortfolioAttribution() {
  return useMutation({
    mutationFn: postPortfolioAttribution,
    retry: false,
  });
}

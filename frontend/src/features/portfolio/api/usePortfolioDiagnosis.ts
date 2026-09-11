import { useMutation } from '@tanstack/react-query';

import { postPortfolioDiagnosis } from './postPortfolioDiagnosis';

/** 버튼으로 실행하는 포트폴리오 진단. AI 요청은 자동 재시도하지 않는다. */
export function usePortfolioDiagnosis() {
  return useMutation({
    mutationFn: postPortfolioDiagnosis,
    retry: false,
  });
}

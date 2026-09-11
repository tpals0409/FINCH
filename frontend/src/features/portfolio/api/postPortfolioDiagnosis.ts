import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import { AiDiagnosisResponseSchema } from '@/shared/types/ai/diagnosis';

/** 포트폴리오 진단을 한 번 실행한다. 요청 본문은 계약상 없다. */
export function postPortfolioDiagnosis() {
  return request(API_PATHS.ai.diagnosis, {
    method: 'POST',
    schema: AiDiagnosisResponseSchema,
  });
}

import { useMutation } from '@tanstack/react-query';

import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  type AiChatRequest,
  AiChatResponseSchema,
} from '@/shared/types/ai/chat';

/**
 * AI 대화 (`POST /ai/chat`).
 *
 * **단발 요청/응답이다. SSE 는 폐기됐다** (contracts C4) — 스트림 파서를 만들지 않고
 * 응답이 올 때까지 기다린다. 백엔드 중계 타임아웃이 60초라 그만큼 걸릴 수 있다.
 *
 * `retry: false` 다. LLM 호출은 한 번이 비싸고, 사용자가 기다리는 화면에서 조용히
 * 두 번 부르면 대기 시간이 배가 된다. 재시도는 사용자가 버튼으로 한다.
 *
 * 캐시에 넣지 않는다. 같은 질문에 같은 답이 온다는 보장이 없어 조회로 다룰 수 없다.
 */
export function useAiChat() {
  return useMutation({
    retry: false,
    mutationFn: (body: AiChatRequest) =>
      request(API_PATHS.ai.chat, {
        method: 'POST',
        body,
        schema: AiChatResponseSchema,
      }),
  });
}

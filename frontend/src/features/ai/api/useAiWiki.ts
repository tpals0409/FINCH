import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';
import {
  AiDeletedFactResponseSchema,
  type AiThesisUpdate,
  AiThesisUpdateResponseSchema,
  AiWikiResponseSchema,
} from '@/shared/types/ai/wiki';

/** 사용자 위키 (`GET /ai/wiki`). 프로필 사실과 투자 논지 한 벌이다. */
export function useAiWiki() {
  return useQuery({
    queryKey: queryKeys.ai.wiki(),
    queryFn: ({ signal }) =>
      request(API_PATHS.ai.wiki, { schema: AiWikiResponseSchema, signal }),
  });
}

/**
 * 논지 수정 (`PUT /ai/wiki/theses/{stockCode}`).
 *
 * 서버는 경로의 종목코드를 기준으로 처리하고 본문의 `ticker` 는 무시하지만,
 * 본문에도 채워 보낸다 (contracts C60).
 */
export function useUpdateAiThesis() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (update: AiThesisUpdate) =>
      request(API_PATHS.ai.wikiThesis(update.ticker), {
        method: 'PUT',
        body: update,
        schema: AiThesisUpdateResponseSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.wiki() });
    },
  });
}

/**
 * 사실 삭제 (`DELETE /ai/wiki/facts/{factId}`).
 *
 * **소프트 삭제다.** 행은 남고 읽기 경로에서만 사라지므로 목록을 다시 부르면 없어져 있다.
 * 본문 있는 200 이라 `requestNoContent` 가 아니라 `request` 를 쓴다 (contracts C61).
 */
export function useDeleteAiWikiFact() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (factId: string) =>
      request(API_PATHS.ai.wikiFact(factId), {
        method: 'DELETE',
        schema: AiDeletedFactResponseSchema,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.wiki() });
    },
  });
}

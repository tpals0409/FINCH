import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { useAuthSession } from '../model/useAuthSession';

import { getMe } from './getMe';

/** 잘 바뀌지 않는 정보라 화면 진입마다 다시 부르지 않는다. */
const ME_STALE_TIME_MS = 5 * 60_000;

/**
 * 로그인한 사용자 정보. **서버 상태이므로 스토어가 아니라 쿼리로 다룬다** (컨벤션 §4).
 *
 * `enabled` 로 막는 이유 — 토큰이 없을 때 부르면 401 이 나고, 인터셉터가 그것을
 * 세션 만료로 읽어 재발급을 건다. 비로그인 상태에서 재발급이 도는 것은 낭비고
 * 부팅 복구와 겹치면 회전 충돌까지 만든다.
 * `unknown` 에서도 막힌다 — 복구 결과가 나오기 전에는 부를 때가 아니다.
 */
export function useMe() {
  const status = useAuthSession((state) => state.status);

  return useQuery({
    queryKey: queryKeys.users.me(),
    queryFn: ({ signal }) => getMe(signal),
    enabled: status === 'authenticated',
    staleTime: ME_STALE_TIME_MS,
  });
}

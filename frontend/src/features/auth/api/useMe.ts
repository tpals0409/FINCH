import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { useAuthSession } from '../model/useAuthSession';

import { getMe } from './getMe';

const ME_STALE_TIME_MS = 5 * 60_000;

/**
 * 로그인한 사용자 정보. 서버 상태라 스토어가 아니라 쿼리로 다룬다 (컨벤션 §4).
 *
 * enabled 로 막는 이유 — 토큰 없이 부르면 401 이 나고 인터셉터가 그것을 세션 만료로
 * 읽어 재발급을 건다. 부팅 복구와 겹치면 회전 충돌까지 만든다.
 * unknown 에서도 막힌다. 복구 결과가 나오기 전에는 부를 때가 아니다.
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

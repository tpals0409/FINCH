import { useMutation } from '@tanstack/react-query';

import { type KakaoLoginRequest } from '@/shared/types/auth';

import { useAuthSession } from '../model/useAuthSession';

import { postKakaoLogin } from './postKakaoLogin';

/**
 * 인가 코드 교환.
 *
 * 쿼리가 아니라 뮤테이션인 이유 — 인가 코드는 한 번만 쓸 수 있어서 캐시·리페치·
 * 포커스 복귀가 전부 성공한 로그인을 깨는 경로가 된다. 자동 재시도도 같은 이유로
 * 금지고, createQueryClient 가 뮤테이션 기본값을 retry: false 로 두고 있다.
 */
export function useKakaoLogin() {
  const setSession = useAuthSession((state) => state.setSession);

  return useMutation({
    mutationFn: (variables: KakaoLoginRequest) => postKakaoLogin(variables),
    onSuccess: (data) =>
      setSession({
        accessToken: data.accessToken,
        user: data.user,
        isNewUser: data.isNewUser,
      }),
  });
}

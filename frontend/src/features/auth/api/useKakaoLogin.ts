import { useMutation } from '@tanstack/react-query';

import { type KakaoLoginRequest } from '@/shared/types/auth';

import { useAuthSession } from '../model/useAuthSession';

import { postKakaoLogin } from './postKakaoLogin';

/**
 * 인가 코드 교환 뮤테이션.
 *
 * **쿼리가 아니라 뮤테이션인 이유가 성격에 있다.** 인가 코드는 한 번만 쓸 수 있어서
 * 같은 입력으로 다시 부르면 반드시 실패한다. 쿼리로 두면 캐시·리페치·창 포커스 복귀가
 * 전부 재호출 경로가 되어 성공한 로그인을 스스로 깬다.
 *
 * 자동 재시도도 같은 이유로 금지다. `createQueryClient` 가 뮤테이션 기본값을
 * `retry: false` 로 두고 있어 여기서 따로 끄지 않는다.
 *
 * 세션 반영은 이 훅 안에서 끝낸다. 부르는 화면이 스토어를 알 필요가 없다 (컨벤션 §5).
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

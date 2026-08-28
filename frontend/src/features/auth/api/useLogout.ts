import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '../model/useAuthSession';

import { postLogout } from './postLogout';

/**
 * 로그아웃. 치워야 할 것이 세 군데다.
 *
 * 1. **서버의 Refresh Token** — `postLogout`. 이걸 안 하면 쿠키가 살아 있어
 *    다음 부팅 복구가 그대로 다시 로그인시킨다
 * 2. **메모리의 Access Token** — `clearSession`
 * 3. **쿼리 캐시** — 안 비우면 다음 로그인 사용자에게 **이전 사용자의 잔고와
 *    보유 종목이 잠깐 보인다.** 새 데이터가 도착하기 전까지 캐시가 그대로 그려지기 때문이다.
 *    공용 PC 나 계정 전환에서 바로 드러난다
 *
 * `onSuccess` 가 아니라 `onSettled` 인 이유 — **서버 호출이 실패해도 로컬은 반드시 비운다.**
 * 네트워크가 끊겼다고 로그아웃 버튼이 아무 일도 하지 않으면 사용자는 로그인 상태로 남는다.
 * 서버 세션이 남는 것은 Refresh Token 의 수명(14일)이 정리하지만, 화면이 로그인 상태로
 * 남는 것은 지금 당장의 문제다.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useAuthSession((state) => state.clearSession);

  return useMutation({
    mutationFn: () => postLogout(),
    onSettled: () => {
      // 세션을 먼저 비운다. 순서가 반대면 캐시를 지우는 순간 아직 로그인 상태로
      // 판단한 쿼리들이 다시 요청을 날린다.
      clearSession();
      queryClient.clear();
    },
  });
}

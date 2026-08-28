import { Button } from '@/shared/ui/Button';

import { useLogout } from '../api/useLogout';

/**
 * 이동은 하지 않는다. 세션이 비면 RequireAuth 가 보낸다 — 여기서도 보내면
 * 판단 지점이 두 곳으로 갈린다.
 */
export function LogoutButton() {
  const { mutate, isPending } = useLogout();

  return (
    <Button variant="secondary" onClick={() => mutate()} disabled={isPending}>
      로그아웃
    </Button>
  );
}

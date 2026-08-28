import { useLogout } from '../api/useLogout';

/**
 * 로그아웃 버튼.
 *
 * 이동은 하지 않는다. 세션이 비면 `RequireAuth` 가 알아서 로그인 화면으로 보낸다 —
 * 여기서 직접 `navigate` 하면 보호 라우트가 아닌 곳에서 눌렀을 때까지 끌려가고,
 * 판단 지점이 두 곳으로 갈린다.
 */
export function LogoutButton() {
  const { mutate, isPending } = useLogout();

  return (
    <button
      type="button"
      onClick={() => mutate()}
      disabled={isPending}
      className="flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 disabled:opacity-50"
    >
      로그아웃
    </button>
  );
}

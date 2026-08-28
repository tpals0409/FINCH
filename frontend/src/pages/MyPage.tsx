import { LogoutButton, useMe } from '@/features/auth';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';

function AccountCard() {
  const { data, isPending, isError, error } = useMe();

  if (isPending) {
    return (
      <Card aria-busy="true">
        <Skeleton className="h-7 w-28" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <p className="text-sm text-slate-600">{error.message}</p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm text-slate-500">로그인 계정</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">
        {data.nickname}
      </p>
    </Card>
  );
}

/**
 * 자리만 잡아 둔 화면이다. 실제 마이페이지(프로필·계좌 리셋·회차 조회 진입)는
 * 별도 티켓이고(ia.md §5, 3-8) 그 티켓이 이 파일을 대체한다.
 * 여기 있는 것은 인증 라우트가 실제로 보호되는지 확인하기 위한 최소한이다.
 */
export function MyPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <h1 className="text-lg font-semibold text-slate-900">마이페이지</h1>

      <div className="mt-4">
        <AccountCard />
      </div>

      <p className="mt-4 text-xs text-slate-400">
        프로필 · 계좌 리셋 · 회차 조회는 별도 티켓입니다
      </p>

      <div className="mt-4">
        <LogoutButton />
      </div>
    </main>
  );
}

import { LogoutButton } from '@/features/auth';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 자리만 잡아 둔 화면이다. 실제 마이페이지(프로필·계좌 리셋·회차 조회 진입)는
 * 별도 티켓이고(ia.md §5, 3-8) 그 티켓이 이 파일을 대체한다.
 * 여기 있는 것은 인증 라우트가 실제로 보호되는지 확인하기 위한 최소한이다.
 */
export function MyPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-slate-900">마이페이지</h1>
      <p className="mt-1 text-xs text-slate-400">
        프로필 · 계좌 리셋 · 회차 조회는 별도 티켓입니다
      </p>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </PageMain>
  );
}

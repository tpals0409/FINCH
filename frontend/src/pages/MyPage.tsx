import { LogoutButton } from '@/features/auth';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 자리만 잡아 둔 화면이다. 실제 내 정보 화면(프로필 · 알림함 · 위키 · 매매 내역 ·
 * 충전 진입 · 로그아웃)은 별도 티켓이고(ia.md §1 "기타", 3-8) 그 티켓이 이 파일을
 * 대체한다. **계좌 초기화와 회차 조회 진입점은 빠졌다** — GitLab 이슈 #27 로
 * 기능 자체가 없어졌다(ia.md §1 "기타").
 * 여기 있는 것은 인증 라우트가 실제로 보호되는지 확인하기 위한 최소한이다.
 */
export function MyPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">마이페이지</h1>
      <p className="mt-1 text-xs text-text-muted">
        프로필 · 알림함 · 위키 · 매매 내역 진입은 별도 티켓입니다
      </p>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </PageMain>
  );
}

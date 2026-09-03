import { SessionCard } from '@/features/auth';
import { HealthCard } from '@/features/health';
import { PageMain } from '@/shared/ui/PageMain';

/** 배선 확인 페이지. */
export function HealthPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">배선 점검</h1>
      <p className="mt-1 text-sm text-text-secondary">
        목 서버 · 서버 상태 · 스키마 검증 · 세션 경로가 살아 있는지 확인합니다
      </p>
      <div className="mt-4 space-y-4">
        <SessionCard />
        <HealthCard />
      </div>
    </PageMain>
  );
}

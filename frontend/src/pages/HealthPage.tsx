import { HealthCard } from '@/features/health';

/**
 * 배선 확인 페이지. 모바일 우선으로 만들고 넓은 화면은
 * 중앙 정렬 + 최대 너비 제한으로만 대응한다 (컨벤션 §9).
 */
export function HealthPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <h1 className="text-lg font-semibold text-slate-900">배선 점검</h1>
      <p className="mt-1 text-sm text-slate-500">
        목 서버 · 서버 상태 · 스키마 검증 경로가 살아 있는지 확인합니다
      </p>
      <div className="mt-4">
        <HealthCard />
      </div>
    </main>
  );
}

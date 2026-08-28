import { KakaoCallback } from '@/features/auth';

/**
 * 카카오 콜백 (`/oauth/kakao`).
 * 카카오 개발자 콘솔에 등록한 redirect URI 와 같은 경로여야 한다 (ia.md §1).
 */
export function KakaoCallbackPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <KakaoCallback />
    </main>
  );
}

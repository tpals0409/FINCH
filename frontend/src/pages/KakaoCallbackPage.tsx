import { KakaoCallback } from '@/features/auth';
import { PageMain } from '@/shared/ui/PageMain';

/** 카카오 콘솔에 등록한 redirect URI 와 같은 경로여야 한다 (ia.md §1). */
export function KakaoCallbackPage() {
  return (
    <PageMain>
      <KakaoCallback />
    </PageMain>
  );
}

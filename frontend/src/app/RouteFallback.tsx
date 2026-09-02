import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * `lazy` 로 연 화면의 청크를 받는 동안 보여 주는 자리표시자.
 * 스피너가 아니라 스켈레톤인 이유는 컨벤션 §6 과 같다 — 자리를 차지해야 화면이 튀지 않는다.
 * **새 컴포넌트를 만들지 않고 `shared/ui/Skeleton` 을 조합만 한다.**
 */
export function RouteFallback() {
  return (
    <PageMain aria-busy="true" aria-label="화면을 불러오는 중">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-4 h-24 w-full" />
      <Skeleton className="mt-3 h-24 w-full" />
    </PageMain>
  );
}

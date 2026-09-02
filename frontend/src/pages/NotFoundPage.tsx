import { ROUTES } from '@/shared/config/routes';
import { LinkButton } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 없는 경로 (`*`). ia.md §1 기타에 화면으로 등재돼 있다.
 *
 * **다른 화면으로 리다이렉트하지 않는다.** 주소를 유지해야 사용자가 무엇을 잘못
 * 열었는지 보이고, 뒤로가기가 온 곳으로 돌아간다. 리다이렉트로 처리하면 기록에
 * 한 칸이 더 쌓여 뒤로가기가 다시 404 로 들어온다.
 */
export function NotFoundPage() {
  return (
    <PageMain className="flex flex-col justify-center">
      <h1 className="text-lg font-semibold text-slate-900">
        찾을 수 없는 화면입니다
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        주소가 바뀌었거나 잘못 입력된 경로입니다
      </p>
      <div className="mt-6">
        <LinkButton to={ROUTES.home} replace>
          홈으로
        </LinkButton>
      </div>
    </PageMain>
  );
}

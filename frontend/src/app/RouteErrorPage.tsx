import { useRouteError } from 'react-router-dom';

import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';

/** 라우트 로딩·렌더 오류를 사용자 언어로 안내하는 전역 오류 화면. */
export function RouteErrorPage() {
  useRouteError();

  return (
    <PageMain className="flex flex-col justify-center">
      <h1 className="text-title-2 text-fg-neutral">화면을 불러오지 못했어요</h1>
      <p className="mt-2 text-body-2 text-fg-neutral-subtle">
        잠시 후 다시 시도해 주세요.
      </p>
      <Button onClick={() => window.location.reload()} className="mt-6">
        새로고침
      </Button>
    </PageMain>
  );
}

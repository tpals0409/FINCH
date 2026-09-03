import { LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useMe } from '../api/useMe';
import { useAuthSession } from '../model/useAuthSession';

function SessionLabel({ children }: { children: string }) {
  return <p className="text-sm text-text-secondary">{children}</p>;
}

function PendingCard() {
  return (
    <Card aria-busy="true">
      <SessionLabel>세션 확인 중</SessionLabel>
      <Skeleton className="mt-3 h-4 w-32" />
    </Card>
  );
}

function SignedOutCard() {
  return (
    <Card>
      <SessionLabel>세션</SessionLabel>
      <p className="mt-1 text-lg font-semibold text-text-primary">비로그인</p>
      <LinkButton to="/login" className="mt-3">
        로그인하러 가기
      </LinkButton>
    </Card>
  );
}

function SignedInCard() {
  const { data, isPending, isError, error } = useMe();

  if (isPending) {
    return (
      <Card aria-busy="true">
        <SessionLabel>세션</SessionLabel>
        <Skeleton className="mt-2 h-7 w-28" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <SessionLabel>세션</SessionLabel>
        <p className="mt-1 text-sm text-text-secondary">{error.message}</p>
      </Card>
    );
  }

  return (
    <Card>
      <SessionLabel>세션</SessionLabel>
      <p className="mt-1 text-lg font-semibold text-text-primary">
        {data.nickname}
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-text-secondary">가입일</dt>
          <dd className="font-medium text-text-primary">
            {data.joinedAt.slice(0, 10)}
          </dd>
        </div>
      </dl>
      <LinkButton to="/my" variant="secondary" className="mt-4">
        마이페이지
      </LinkButton>
    </Card>
  );
}

/**
 * 세션 배선 확인용 카드. 인증 레이어는 눈에 보이는 것이 없어 그대로 두면 확인할
 * 방법이 없다. 실제 화면(헤더·마이페이지)이 붙으면 통째로 지운다.
 */
export function SessionCard() {
  const status = useAuthSession((state) => state.status);

  if (status === 'unknown') {
    return <PendingCard />;
  }
  if (status === 'unauthenticated') {
    return <SignedOutCard />;
  }
  return <SignedInCard />;
}

import { Link } from 'react-router-dom';

import { Skeleton } from '@/shared/ui/Skeleton';

import { useMe } from '../api/useMe';
import { useAuthSession } from '../model/useAuthSession';

/**
 * 세션 배선이 살아 있는지 보는 카드.
 *
 * 인증 레이어는 눈에 보이는 것이 없어서 그대로 두면 확인할 방법이 없다.
 * `features/health` 가 목 서버 배선을 확인하는 것과 같은 성격이고, 실제 화면
 * (헤더·마이페이지)이 붙으면 통째로 지운다.
 *
 * 여기서 확인되는 것은 세 가지다 — 부팅 복구가 도는가, Authorization 헤더가
 * 붙는가, 만료 토큰이 재발급 후 재시도로 되살아나는가.
 */
export function SessionCard() {
  const status = useAuthSession((state) => state.status);
  const { data, isPending, isError, error } = useMe();

  if (status === 'unknown') {
    return (
      <section
        className="rounded-xl border border-slate-200 p-4"
        aria-busy="true"
      >
        <p className="text-sm text-slate-500">세션 확인 중</p>
        <Skeleton className="mt-3 h-4 w-32" />
      </section>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <section className="rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">세션</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">비로그인</p>
        <Link
          to="/login"
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white"
        >
          로그인하러 가기
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">세션</p>
      {isPending ? (
        <Skeleton className="mt-2 h-7 w-28" />
      ) : isError ? (
        <p className="mt-1 text-sm text-slate-600">{error.message}</p>
      ) : (
        <>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {data.nickname}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between">
              <dt className="text-slate-500">현재 회차</dt>
              <dd className="font-medium text-slate-900">
                {data.currentRoundId}
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-slate-500">가입일</dt>
              <dd className="font-medium text-slate-900">
                {data.joinedAt.slice(0, 10)}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}

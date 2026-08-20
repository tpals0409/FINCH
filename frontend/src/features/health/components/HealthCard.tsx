import { formatKstTime } from '@/shared/lib/formatDate';
import {
  formatKrw,
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useHealthStatus } from '../api/useHealthStatus';

/** 등락 방향을 의미 토큰 클래스로 바꾼다. 색 이름을 직접 쓰지 않는다 (컨벤션 §6). */
const DIRECTION_TEXT_CLASS = {
  rise: 'text-rise',
  fall: 'text-fall',
  flat: 'text-flat',
} as const;

/**
 * MSW 핸들러 → Zod 스키마 → 쿼리 훅 → 컴포넌트 배선이 살아 있는지 보는 카드.
 * 로딩·에러·성공 세 상태를 모두 그린다 (컨벤션 §7).
 */
export function HealthCard() {
  const { data, isPending, isError, refetch, isFetching } = useHealthStatus();

  if (isPending) {
    return (
      <section className="rounded-xl border border-slate-200 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-32" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-600">
          연결 상태를 불러오지 못했습니다
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-3 min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          다시 시도
        </button>
      </section>
    );
  }

  const direction = getPriceDirection(data.sampleChangeRatio);

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">목 서버 연결 상태</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">
        {data.status === 'ok' ? '정상' : '지연'}
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-slate-500">샘플 지수</dt>
          <dd className="font-medium text-slate-900">
            {formatKrw(data.sampleIndexValue)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-slate-500">등락률</dt>
          <dd className={`font-medium ${DIRECTION_TEXT_CLASS[direction]}`}>
            {formatSignedPercent(data.sampleChangeRatio)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-slate-500">서버 시각</dt>
          <dd className="font-medium text-slate-900">
            {formatKstTime(data.serverTime)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

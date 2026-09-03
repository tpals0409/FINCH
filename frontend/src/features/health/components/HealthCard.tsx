import { formatKstTime } from '@/shared/lib/formatDate';
import {
  formatKrw,
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useHealthStatus } from '../api/useHealthStatus';

/** 등락 방향을 의미 토큰 클래스로 바꾼다. 색 이름을 직접 쓰지 않는다 (컨벤션 §6). */
const DIRECTION_TEXT_CLASS = {
  rise: 'text-fg-up',
  fall: 'text-fg-down',
  flat: 'text-fg-flat',
} as const;

/**
 * MSW 핸들러 → Zod 스키마 → 쿼리 훅 → 컴포넌트 배선이 살아 있는지 보는 카드.
 * 로딩·에러·성공 세 상태를 모두 그린다 (컨벤션 §7).
 */
export function HealthCard() {
  const { data, isPending, isError, refetch, isFetching } = useHealthStatus();

  if (isPending) {
    return (
      <Card>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-32" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <p className="text-sm text-fg-neutral-subtle">
          연결 상태를 불러오지 못했습니다
        </p>
        <Button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-3"
        >
          다시 시도
        </Button>
      </Card>
    );
  }

  const direction = getPriceDirection(data.sampleChangeRatio);

  return (
    <Card>
      <p className="text-sm text-fg-neutral-subtle">목 서버 연결 상태</p>
      <p className="mt-1 text-2xl font-semibold text-fg-neutral">
        {data.status === 'ok' ? '정상' : '지연'}
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-fg-neutral-subtle">샘플 지수</dt>
          <dd className="font-medium text-fg-neutral">
            {formatKrw(data.sampleIndexValue)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-fg-neutral-subtle">등락률</dt>
          <dd className={`font-medium ${DIRECTION_TEXT_CLASS[direction]}`}>
            {formatSignedPercent(data.sampleChangeRatio)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-fg-neutral-subtle">서버 시각</dt>
          <dd className="font-medium text-fg-neutral">
            {formatKstTime(data.serverTime)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

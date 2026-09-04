import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { formatKstDateTime } from '@/shared/lib/formatDate';
import { formatKrw } from '@/shared/lib/formatNumber';
import type { AccountSummaryResponse } from '@/shared/types/account';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * 잔고 요약 카드 (apiSpec §3.1 · featureSpec §9.1 · 와이어프레임 아트보드 1).
 *
 * **모든 값이 서버 값이다.** 총자산을 화면에서 다시 더하지 않는다 — 서버가 원장에서 계산한
 * `totalAsset` 을 그대로 쓴다 (featureSpec §9.3). 화면이 더하면 서버와 어긋날 자리가 생긴다.
 *
 * 포트폴리오 전체 수익률과 총자산 추이 그래프는 MVP 범위 밖이다 (featureSpec §9.1).
 * **자리를 비워두지 않았다** — 비워두면 다음 사람이 채울 것으로 읽는다.
 */
type Props = { summary: AccountSummaryResponse };

export function AccountSummaryCard({ summary }: Props) {
  return (
    <Card>
      <p className="text-caption text-fg-neutral-subtle">총자산</p>
      <p className="mt-1 text-display text-fg-neutral">
        {formatKrw(summary.totalAsset)}
      </p>
      <p className="mt-1 text-caption text-fg-neutral-subtle">
        {formatKstDateTime(summary.asOf)} 기준
      </p>

      <dl className="mt-5 space-y-3 border-t border-stroke-neutral-subtle pt-4">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-2 text-fg-neutral-subtle">예수금</dt>
          <dd className="flex items-center gap-3">
            <span className="text-body-1 text-fg-neutral">
              {formatKrw(summary.cashBalance)}
            </span>
            {/*
              밑줄 텍스트 링크지만 터치 영역은 44px 를 채운다. 글자 높이(20px)만큼만
              누를 수 있으면 손가락으로는 빗나가고, 그 자리는 화면에서 가장 자주 눌리는
              진입점이다. `-my-3` 로 바깥 여백을 되돌려 카드 안 간격은 그대로 둔다.
            */}
            <Link
              to={ROUTES.deposit}
              className="-my-3 flex min-h-[44px] items-center text-label text-fg-neutral underline underline-offset-4"
            >
              충전하기
            </Link>
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-2 text-fg-neutral-subtle">평가금액</dt>
          {/*
            지금 이 값은 항상 0 이다. 보유가 없어서가 아니라 holding·price 도메인이 아직
            없어서다 (apiSpec §3.1 · backend AccountSummaryRes 주석). 화면에는 그 이유를 쓰지
            않는다 — 사용자에게는 "보유 종목이 없다" 가 이유의 전부다.
          */}
          <dd className="text-body-1 text-fg-neutral">
            {formatKrw(summary.evaluationAmount)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

/** 로딩 자리표시자. 실제 카드와 같은 높이를 차지해 값이 도착할 때 레이아웃이 흔들리지 않는다. */
export function AccountSummaryCardSkeleton() {
  return (
    <Card>
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-2 h-9 w-48" />
      <Skeleton className="mt-2 h-3 w-32" />
      <div className="mt-5 space-y-3 border-t border-stroke-neutral-subtle pt-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    </Card>
  );
}

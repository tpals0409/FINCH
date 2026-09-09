import { Link } from 'react-router-dom';

import {
  AccountSummaryCardSkeleton,
  useAccountSummary,
} from '@/features/account';
import { PortfolioSection } from '@/features/portfolio';
import { WatchlistSection } from '@/features/stocks';
import { ROUTES } from '@/shared/config/routes';
import { formatKrw } from '@/shared/lib/formatNumber';
import { AppBar } from '@/shared/ui/AppBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { SupportingText } from '@/shared/ui/SupportingText';

function HomeActions() {
  return (
    <nav aria-label="홈 메뉴" className="flex items-center gap-1">
      <Link
        to={ROUTES.search}
        aria-label="종목 검색"
        className="flex size-11 items-center justify-center rounded-md text-fg-neutral"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6 fill-none stroke-current"
          strokeWidth="1.8"
        >
          <circle cx="10.8" cy="10.8" r="5.8" />
          <path d="m15.2 15.2 4.6 4.6" strokeLinecap="round" />
        </svg>
      </Link>
      <Link
        to={ROUTES.my}
        aria-label="내 정보"
        className="flex size-11 items-center justify-center rounded-md text-fg-neutral"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6 fill-none stroke-current"
          strokeWidth="1.8"
        >
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </Link>
    </nav>
  );
}

function CashBalanceCard({ cashBalance }: { cashBalance: number }) {
  return (
    <Card>
      <SupportingText size="caption">원화 잔고</SupportingText>
      <p className="mt-1 text-title-1 text-fg-neutral">
        {formatKrw(cashBalance)}
      </p>
      <Link
        to={ROUTES.deposit}
        viewTransition
        className="mt-4 inline-flex min-h-touch-min items-center text-label text-fg-neutral underline underline-offset-4"
      >
        충전하기
      </Link>
    </Card>
  );
}

/**
 * 홈 (ia.md §1 · featureSpec §2).
 *
 * 자산 요약·보유 종목·관심 종목은 **서로 다른 요청이라 따로 실패한다.** 한쪽이 죽어도
 * 다른 영역은 보인다 — 관심 종목 하나 때문에 계좌와 보유 종목을 못 보는 편이 나쁘다.
 */
export function HomePage() {
  const { data, isPending, isError, refetch, isFetching } = useAccountSummary();

  return (
    <PageMain>
      <AppBar title="FINCH" actions={<HomeActions />} />

      {isPending ? (
        <AccountSummaryCardSkeleton />
      ) : isError ? (
        <Card>
          <SupportingText>자산을 불러오지 못했어요</SupportingText>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 불러오기
          </Button>
        </Card>
      ) : (
        <CashBalanceCard cashBalance={data.cashBalance} />
      )}

      <PortfolioSection />
      <WatchlistSection />
      <Link
        to={ROUTES.transactions}
        viewTransition
        className="mt-6 inline-flex min-h-touch-min items-center text-label text-fg-neutral underline underline-offset-4"
      >
        주문내역
      </Link>
    </PageMain>
  );
}

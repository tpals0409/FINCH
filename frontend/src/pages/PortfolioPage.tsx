import {
  AccountSummaryCard,
  AccountSummaryCardSkeleton,
  useAccountSummary,
} from '@/features/account';
import { PortfolioDiagnosisSection } from '@/features/portfolio/components/PortfolioDiagnosisSection';
import { PortfolioSection } from '@/features/portfolio/components/PortfolioSection';
import { AppBar } from '@/shared/ui/AppBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { SupportingText } from '@/shared/ui/SupportingText';

/**
 * 주식 잔고 (apiSpec §3.1 · featureSpec §9 · 와이어프레임 아트보드 1·2).
 * 계좌 요약과 보유 종목 목록은 각각의 서버 상태 훅으로 읽고, 목록은 공용 포트폴리오 섹션에서
 * 정렬·표시 전환·빈 상태까지 처리한다.
 */
export function PortfolioPage() {
  const { data, isPending, isError, refetch, isFetching } = useAccountSummary();

  return (
    <PageMain>
      <AppBar title="포트폴리오" />

      <div className="space-y-4">
        {isPending ? <AccountSummaryCardSkeleton /> : null}

        {isError ? (
          <Card>
            <SupportingText>잔고를 불러오지 못했어요</SupportingText>
            <Button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="mt-3"
            >
              다시 불러오기
            </Button>
          </Card>
        ) : null}

        {data ? (
          <>
            <AccountSummaryCard summary={data} />
            <PortfolioSection />
            <PortfolioDiagnosisSection />
          </>
        ) : null}
      </div>
    </PageMain>
  );
}

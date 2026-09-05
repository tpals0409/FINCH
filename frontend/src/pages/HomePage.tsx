import {
  AccountSummaryCard,
  AccountSummaryCardSkeleton,
  useAccountSummary,
} from '@/features/account';
import { WatchlistSection } from '@/features/stocks';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 홈 (ia.md §1 · featureSpec §2).
 *
 * **보유 종목 요약과 오늘의 브리핑은 아직 없다.** ia.md 는 홈을 네 영역(자산 · 보유 · 관심 ·
 * 브리핑)으로 그렸지만, `GET /portfolio` 는 백엔드에 없고 `GET /ai/briefing` 은 AI 서버가
 * 아직 배포되지 않았다. 목만 보고 먼저 그리면 실서버에서 두 영역이 통째로 비는데,
 * 그때는 이 화면이 고장 난 것처럼 보인다. 각각 백엔드가 생길 때 붙인다.
 *
 * 자산 요약과 관심 종목은 **서로 다른 요청이라 따로 실패한다.** 한쪽이 죽어도 다른 쪽은
 * 보인다 — 관심 종목 하나 때문에 총자산을 못 보는 편이 나쁘다.
 */
export function HomePage() {
  const { data, isPending, isError, refetch, isFetching } = useAccountSummary();

  return (
    <PageMain>
      <h1 className="sr-only">홈</h1>

      {isPending ? (
        <AccountSummaryCardSkeleton />
      ) : isError ? (
        <Card>
          <p className="text-body-2 text-fg-neutral-subtle">
            자산을 불러오지 못했습니다
          </p>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 시도
          </Button>
        </Card>
      ) : (
        <AccountSummaryCard summary={data} />
      )}

      <WatchlistSection />
    </PageMain>
  );
}

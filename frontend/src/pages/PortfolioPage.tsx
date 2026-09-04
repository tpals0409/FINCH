import {
  AccountSummaryCard,
  AccountSummaryCardSkeleton,
  EmptyHoldings,
  useAccountSummary,
} from '@/features/account';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 주식 잔고 (apiSpec §3.1 · featureSpec §9 · 와이어프레임 아트보드 1·2).
 *
 * **보유 종목 목록이 없다.** `GET /portfolio` 는 주문이 없어 항상 빈 배열이고 `holding` 도메인도
 * 아직 없다. 빈 목록을 부르는 대신 그 사실을 그리는 쪽을 골랐다 — 있지도 않은 요청을 보내면
 * 다음 사람이 그것을 구현된 기능으로 읽는다.
 */
export function PortfolioPage() {
  const { data, isPending, isError, refetch, isFetching } = useAccountSummary();

  return (
    <PageMain>
      <h1 className="text-title-2 text-fg-neutral">포트폴리오</h1>

      <div className="mt-4 space-y-4">
        {isPending ? <AccountSummaryCardSkeleton /> : null}

        {isError ? (
          <Card>
            <p className="text-body-2 text-fg-neutral-subtle">
              잔고를 불러오지 못했습니다
            </p>
            <Button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="mt-3"
            >
              다시 시도
            </Button>
          </Card>
        ) : null}

        {data ? (
          <>
            <AccountSummaryCard summary={data} />

            {/*
              보유 종목 자리는 평가금액이 0 일 때만 그린다.

              이 화면은 보유 목록을 부르지 않는다(범위 밖). 그래서 평가금액이 0 이 아닌데
              "보유 중인 종목이 없습니다" 를 띄우면 화면이 자기모순이 된다 — MSW 목은 보유를
              가진 계좌를 흉내내므로 실제로 그 조합이 나온다.

              실제 백엔드는 holding·price 도메인이 없어 평가금액이 항상 0 이라 이 조건은 늘
              참이고, 와이어프레임 아트보드 1 과 정확히 같은 화면이 된다. 보유 목록이 붙는
              스프린트에서 이 분기는 목록 렌더로 대체된다.
            */}
            {data.evaluationAmount === 0 ? (
              <section>
                <h2 className="text-title-3 text-fg-neutral">보유 종목</h2>
                <div className="mt-2">
                  <EmptyHoldings />
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </PageMain>
  );
}

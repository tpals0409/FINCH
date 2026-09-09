import { useParams, useSearchParams } from 'react-router-dom';

import {
  StockCandleSection,
  StockDetailPrice,
  WatchToggleButton,
  useStockDetail,
} from '@/features/stocks';
import { ROUTES, STOCK_CODE_PARAM } from '@/shared/config/routes';
import {
  formatKrw,
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import {
  CandlePeriodSchema,
  type CandlePeriod,
  type StockHoldingSummary,
} from '@/shared/types/stock';
import { AppBar } from '@/shared/ui/AppBar';
import { Button, LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { NumericValue } from '@/shared/ui/NumericValue';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SupportingText } from '@/shared/ui/SupportingText';

/**
 * 종목 상세 (apiSpec §5.2 · featureSpec §7.1).
 *
 * 차트 기간은 URL 상태다. 링크를 공유하거나 뒤로 갔을 때 같은 기간이 보여야 한다
 * (`frontend/docs/frontConvention.md` §4 URL 상태).
 */
export function StockDetailPage() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const stockCode = params[STOCK_CODE_PARAM] ?? '';
  const parsedPeriod = CandlePeriodSchema.safeParse(searchParams.get('period'));
  const period: CandlePeriod = parsedPeriod.success ? parsedPeriod.data : '1M';
  const { data, isPending, isError, refetch, isFetching } =
    useStockDetail(stockCode);

  const handlePeriodChange = (nextPeriod: CandlePeriod) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('period', nextPeriod);
        return next;
      },
      { replace: true },
    );
  };

  if (isPending) {
    return (
      <PageMain>
        <AppBar title="종목 상세" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-12 w-56" />
        <Skeleton className="mt-6 h-24 w-full" />
      </PageMain>
    );
  }

  if (isError) {
    return (
      <PageMain>
        <AppBar title="종목 상세" />
        <Card>
          <SupportingText>종목 정보를 불러오지 못했어요</SupportingText>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 불러오기
          </Button>
        </Card>
      </PageMain>
    );
  }

  return (
    <PageMain>
      <AppBar title={data.stockName} fallbackTo={ROUTES.search} />
      <SupportingText className="tabular-nums">
        {data.stockCode} · {data.market}
      </SupportingText>

      {data.suspended ? (
        <Card className="mt-4">
          <p className="text-body-1 text-fg-neutral">거래정지 종목이에요</p>
          {data.suspendedReason ? (
            <SupportingText className="mt-1">
              {data.suspendedReason}
            </SupportingText>
          ) : null}
        </Card>
      ) : null}

      <StockDetailPrice stock={data} />

      <StockCandleSection
        stockCode={data.stockCode}
        period={period}
        onPeriodChange={handlePeriodChange}
      />

      <div className="mt-6 flex flex-col gap-2">
        {data.suspended ? (
          <Button disabled>매수·매도</Button>
        ) : (
          <LinkButton to={ROUTES.stockOrder(data.stockCode)}>
            매수·매도
          </LinkButton>
        )}
        <WatchToggleButton stockCode={data.stockCode} watched={data.watched} />
      </div>

      {data.holding ? <HoldingCard holding={data.holding} /> : null}
    </PageMain>
  );
}

/**
 * 보유 정보. `holding` 이 `null` 이면 통째로 안 그린다.
 *
 * **전량 매도로 수량 0 인 행이 남아 있어도 서버가 `null` 을 준다** (apiSpec §5.2, 이슈 #19).
 * 그래서 화면은 수량 0 을 따로 다루지 않는다.
 */
function HoldingCard({ holding }: { holding: StockHoldingSummary }) {
  const { evaluationProfit, evaluationProfitRate } = holding;
  const hasEvaluation =
    evaluationProfit !== null && evaluationProfitRate !== null;
  const profitClass = hasEvaluation
    ? {
        rise: 'text-fg-up',
        fall: 'text-fg-down',
        flat: 'text-fg-flat',
      }[getPriceDirection(evaluationProfitRate)]
    : 'text-fg-neutral-subtle';

  return (
    <Card className="mt-6">
      <h2 className="text-title-3 text-fg-neutral">내 보유</h2>
      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-body-2">
        <dt className="text-fg-neutral-subtle">수량</dt>
        <NumericValue>{holding.quantity}주</NumericValue>
        <dt className="text-fg-neutral-subtle">평균 매입가</dt>
        <NumericValue>{formatKrw(holding.avgBuyPrice)}</NumericValue>
        <dt className="text-fg-neutral-subtle">평가 손익</dt>
        <dd className={`text-right tabular-nums ${profitClass}`}>
          {hasEvaluation ? (
            <>
              {formatKrw(evaluationProfit)} (
              {formatSignedPercent(evaluationProfitRate)})
            </>
          ) : (
            '—'
          )}
        </dd>
      </dl>
    </Card>
  );
}

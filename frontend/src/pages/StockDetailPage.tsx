import { useParams } from 'react-router-dom';

import {
  StockDetailPrice,
  WatchToggleButton,
  useStockDetail,
} from '@/features/stocks';
import { STOCK_CODE_PARAM } from '@/shared/config/routes';
import {
  formatKrw,
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import type { StockHoldingSummary } from '@/shared/types/stock';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * 종목 상세 (apiSpec §5.2 · featureSpec §7.1).
 *
 * **차트는 아직 없다.** `daily_candle` 이 비어 있고 채우려면 KRX API 키가 필요한데 미발급이다
 * (MEMORY "외부 API 키 4종 미발급"). 목은 캔들을 만들어 주지만, 목에서만 보이는 차트를 먼저
 * 붙이면 실서버에서 빈 캔버스를 보고 차트가 고장 난 줄 알게 된다. 키가 나오면 붙인다.
 */
export function StockDetailPage() {
  const params = useParams();
  const stockCode = params[STOCK_CODE_PARAM] ?? '';
  const { data, isPending, isError, refetch, isFetching } =
    useStockDetail(stockCode);

  if (isPending) {
    return (
      <PageMain>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-4 h-12 w-56" />
        <Skeleton className="mt-6 h-24 w-full" />
      </PageMain>
    );
  }

  if (isError) {
    return (
      <PageMain>
        <Card>
          <p className="text-body-2 text-fg-neutral-subtle">
            종목을 불러오지 못했습니다
          </p>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 시도
          </Button>
        </Card>
      </PageMain>
    );
  }

  return (
    <PageMain>
      <h1 className="text-title-2 text-fg-neutral">{data.stockName}</h1>
      <p className="mt-1 text-body-2 text-fg-neutral-subtle tabular-nums">
        {data.stockCode} · {data.market}
      </p>

      {data.suspended ? (
        <Card className="mt-4">
          <p className="text-body-1 text-fg-neutral">거래정지 종목입니다</p>
          {data.suspendedReason ? (
            <p className="mt-1 text-body-2 text-fg-neutral-subtle">
              {data.suspendedReason}
            </p>
          ) : null}
        </Card>
      ) : null}

      <StockDetailPrice stock={data} />

      <div className="mt-6">
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
  const direction = getPriceDirection(holding.evaluationProfitRate);
  const profitClass = {
    rise: 'text-fg-up',
    fall: 'text-fg-down',
    flat: 'text-fg-flat',
  }[direction];

  return (
    <Card className="mt-6">
      <h2 className="text-title-3 text-fg-neutral">내 보유</h2>
      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-body-2">
        <dt className="text-fg-neutral-subtle">수량</dt>
        <dd className="text-right text-fg-neutral tabular-nums">
          {holding.quantity}주
        </dd>
        <dt className="text-fg-neutral-subtle">평균 매입가</dt>
        <dd className="text-right text-fg-neutral tabular-nums">
          {formatKrw(holding.avgBuyPrice)}
        </dd>
        <dt className="text-fg-neutral-subtle">평가 손익</dt>
        <dd className={`text-right tabular-nums ${profitClass}`}>
          {formatKrw(holding.evaluationProfit)} (
          {formatSignedPercent(holding.evaluationProfitRate)})
        </dd>
      </dl>
    </Card>
  );
}

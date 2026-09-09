import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { usePortfolio } from '@/features/portfolio/api/usePortfolio';
import { ROUTES } from '@/shared/config/routes';
import {
  formatKrw,
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import type { Holding, PortfolioResponse } from '@/shared/types/portfolio';
import { PercentSchema } from '@/shared/types/primitives';
import { BottomSheetSelect } from '@/shared/ui/BottomSheetSelect';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SupportingText } from '@/shared/ui/SupportingText';

type PortfolioSort = 'evaluation' | 'profitRate';
type ValueDisplay = 'currentPrice' | 'evaluationAmount';

const SORT_OPTIONS = [
  { value: 'profitRate', label: '수익률 높은 순' },
  { value: 'evaluation', label: '평가금액 높은 순' },
] as const satisfies readonly { value: PortfolioSort; label: string }[];

const DIRECTION_CLASS = {
  rise: 'text-fg-up',
  fall: 'text-fg-down',
  flat: 'text-fg-flat',
} as const;

function getHoldingValue(holding: Holding, display: ValueDisplay) {
  return display === 'currentPrice'
    ? holding.currentPrice
    : holding.evaluationAmount;
}

function sortHoldings(holdings: Holding[], sort: PortfolioSort) {
  return [...holdings].sort((left, right) => {
    if (sort === 'profitRate') {
      return (
        (right.evaluationProfitRate ?? Number.NEGATIVE_INFINITY) -
        (left.evaluationProfitRate ?? Number.NEGATIVE_INFINITY)
      );
    }
    return (
      (right.evaluationAmount ?? Number.NEGATIVE_INFINITY) -
      (left.evaluationAmount ?? Number.NEGATIVE_INFINITY)
    );
  });
}

function summarizePerformance(portfolio: PortfolioResponse) {
  if (portfolio.holdings.length === 0) {
    return { profit: null, rate: null };
  }

  if (
    portfolio.holdings.some(({ evaluationProfit }) => evaluationProfit === null)
  ) {
    return { profit: null, rate: null };
  }

  const profit = portfolio.holdings.reduce(
    (total, holding) => total + (holding.evaluationProfit ?? 0),
    0,
  );
  const investedAmount = portfolio.holdings.reduce(
    (total, holding) => total + holding.avgBuyPrice * holding.quantity,
    0,
  );

  return {
    profit,
    rate:
      investedAmount === 0
        ? null
        : PercentSchema.parse((profit / investedAmount) * 100),
  };
}

function Performance({ portfolio }: { portfolio: PortfolioResponse }) {
  const { profit, rate } = summarizePerformance(portfolio);
  const direction = rate === null ? 'flat' : getPriceDirection(rate);

  return (
    <div className="mt-5 flex items-end justify-between gap-4">
      <div>
        <SupportingText size="caption">평가액</SupportingText>
        <p className="mt-1 text-title-1 text-fg-neutral">
          {portfolio.evaluationAmount === null
            ? '—'
            : formatKrw(portfolio.evaluationAmount)}
        </p>
      </div>
      <div className={`text-right ${DIRECTION_CLASS[direction]}`}>
        <SupportingText as="p" size="caption">
          평가 손익
        </SupportingText>
        <p className="mt-1 text-body-1">
          {profit === null ? '—' : formatKrw(profit)}
        </p>
        <p className="text-body-2">
          {rate === null ? '—' : formatSignedPercent(rate)}
        </p>
      </div>
    </div>
  );
}

function HoldingRow({
  holding,
  display,
}: {
  holding: Holding;
  display: ValueDisplay;
}) {
  const value = getHoldingValue(holding, display);
  const rate =
    holding.evaluationProfitRate === null
      ? null
      : PercentSchema.parse(holding.evaluationProfitRate);
  const direction = rate === null ? 'flat' : getPriceDirection(rate);

  return (
    <li>
      <Link
        to={ROUTES.stockDetail(holding.stockCode)}
        viewTransition
        className="flex items-center justify-between gap-3 border-t border-stroke-neutral-subtle py-3"
      >
        <span className="min-w-0">
          <span className="block truncate text-body-1 text-fg-neutral">
            {holding.stockName}
          </span>
          <SupportingText as="span" size="caption">
            평균 {formatKrw(holding.avgBuyPrice)} · {holding.quantity}주
          </SupportingText>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-body-1 text-fg-neutral">
            {value === null ? '—' : formatKrw(value)}
          </span>
          <span className={`text-body-2 ${DIRECTION_CLASS[direction]}`}>
            {rate === null ? '시세 없음' : formatSignedPercent(rate)}
          </span>
        </span>
      </Link>
    </li>
  );
}

function PortfolioContent({ portfolio }: { portfolio: PortfolioResponse }) {
  const [sort, setSort] = useState<PortfolioSort>('profitRate');
  const [display, setDisplay] = useState<ValueDisplay>('currentPrice');
  const holdings = useMemo(
    () => sortHoldings(portfolio.holdings, sort),
    [portfolio.holdings, sort],
  );

  return (
    <section className="mt-6" aria-labelledby="my-investment-heading">
      <h2 id="my-investment-heading" className="text-title-3 text-fg-neutral">
        내 투자
      </h2>
      <Performance portfolio={portfolio} />

      <div className="mt-5 flex items-center justify-between gap-3">
        <BottomSheetSelect
          value={sort}
          options={SORT_OPTIONS}
          label="보유 종목 정렬"
          onChange={setSort}
        />
        <div
          className="flex rounded-md border border-stroke-neutral-weak p-0.5"
          role="group"
          aria-label="보유 종목 금액 표시"
        >
          <button
            type="button"
            aria-pressed={display === 'currentPrice'}
            onClick={() => setDisplay('currentPrice')}
            className={`rounded-sm px-2 py-1 text-caption ${display === 'currentPrice' ? 'bg-bg-transparent-pressed text-fg-neutral' : 'text-fg-neutral-subtle'}`}
          >
            현재가
          </button>
          <button
            type="button"
            aria-pressed={display === 'evaluationAmount'}
            onClick={() => setDisplay('evaluationAmount')}
            className={`rounded-sm px-2 py-1 text-caption ${display === 'evaluationAmount' ? 'bg-bg-transparent-pressed text-fg-neutral' : 'text-fg-neutral-subtle'}`}
          >
            평가금
          </button>
        </div>
      </div>

      {holdings.length === 0 ? (
        <Card className="mt-3 text-center">
          <p className="text-body-1 text-fg-neutral">보유 중인 종목이 없어요</p>
          <SupportingText size="caption" className="mt-1">
            종목을 매수하면 여기에 보여요
          </SupportingText>
        </Card>
      ) : (
        <ul className="mt-2">
          {holdings.map((holding) => (
            <HoldingRow
              key={holding.stockCode}
              holding={holding}
              display={display}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function PortfolioSection() {
  const { data, isPending, isError, refetch, isFetching } = usePortfolio();

  if (isPending) {
    return (
      <section
        className="mt-6"
        aria-busy="true"
        aria-label="내 투자 불러오는 중"
      >
        <Skeleton className="h-6 w-20" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-3 h-14 w-full" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mt-6" aria-labelledby="my-investment-heading">
        <h2 id="my-investment-heading" className="text-title-3 text-fg-neutral">
          내 투자
        </h2>
        <Card className="mt-2">
          <SupportingText>투자 정보를 불러오지 못했어요</SupportingText>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            다시 불러오기
          </Button>
        </Card>
      </section>
    );
  }

  return <PortfolioContent portfolio={data} />;
}

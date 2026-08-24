import {
  formatCompactKrw,
  formatCount,
  formatDecimal,
  formatKrw,
} from '@/shared/lib/formatNumber';
import { DataRow } from '@/shared/ui/DataRow';

import { useStockProfile } from '../api/useStockDetail';

type StockProfileTableProps = {
  stockCode: string;
};

/**
 * 기업 구획. 도감의 분류·서식지 항목에 대응한다.
 *
 * PER·PBR 같은 지표에 색을 칠하지 않는다. 적/청은 등락에만 쓰는 색이고
 * 여기까지 번지면 화면 어디를 봐도 색이 무슨 뜻인지 알 수 없게 된다.
 */
export function StockProfileTable({ stockCode }: StockProfileTableProps) {
  const { data, isPending, isError, refetch, isFetching } =
    useStockProfile(stockCode);

  if (isPending) {
    return (
      <div className="animate-pulse space-y-3 px-4 py-3" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map((row) => (
          <div key={row} className="h-4 bg-rule-faint" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 pb-5">
        <p className="text-[0.9375rem] text-ink">
          기업 정보를 불러오지 못했습니다
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-3 min-h-11 border border-ink px-4 font-display text-[0.8125rem] font-semibold tracking-[0.04em] text-ink disabled:opacity-50"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <dl className="pb-1">
      <DataRow label="업종" value={data.sector} />
      <DataRow label="시가총액" value={formatCompactKrw(data.marketCap)} />
      <DataRow
        label="상장주식수"
        value={`${formatCount(data.listedShares)}주`}
      />
      <DataRow label="PER" value={`${formatDecimal(data.per, 1)}배`} />
      <DataRow label="PBR" value={`${formatDecimal(data.pbr, 2)}배`} />
      <DataRow label="EPS" value={formatKrw(data.eps)} />
      <DataRow label="BPS" value={formatKrw(data.bps)} />
      <DataRow label="52주 최고" value={formatKrw(data.week52High)} />
      <DataRow label="52주 최저" value={formatKrw(data.week52Low)} />
    </dl>
  );
}

import {
  formatCompactKrw,
  formatCount,
  formatKrw,
} from '@/shared/lib/formatNumber';
import { DataCell } from '@/shared/ui/DataCell';

import { useStockDetail, useStockProfile } from '../api/useStockDetail';

type StockMeasurementsProps = {
  stockCode: string;
};

/**
 * 표제부에 붙는 계측치 격자.
 *
 * 구획 표제를 달지 않는다. 칸마다 이름이 붙어 있어 표제가 같은 말을 두 번 하고,
 * 40px 을 더 먹어 도판을 첫 화면 밖으로 밀어낸다. 도감의 계측표도 표 위에
 * "계측치"라고 다시 쓰지 않는다.
 *
 * 고가·저가는 여기 없다. 바로 위 일중 범위 막대가 그 둘을 이미 축으로 쓰고
 * 양끝에 수치를 적는다. 같은 값을 두 번 적으면 어느 쪽을 봐야 하는지 물어야 한다.
 */
export function StockMeasurements({ stockCode }: StockMeasurementsProps) {
  const detailQuery = useStockDetail(stockCode);
  const profileQuery = useStockProfile(stockCode);

  if (profileQuery.isPending || detailQuery.isPending) {
    // 스켈레톤은 실제 격자와 같은 칸 수·같은 높이를 차지한다. 크기가 다르면
    // 데이터가 도착할 때 아래 구획이 통째로 밀린다.
    return (
      <div className="grid animate-pulse grid-cols-2" aria-hidden="true">
        {[0, 1, 2, 3].map((cell) => (
          <div
            key={cell}
            className="border-t border-rule-faint px-4 py-2 odd:border-r"
          >
            <div className="h-3 w-14 bg-rule-faint" />
            <div className="mt-1.5 h-4 w-20 bg-rule-faint" />
          </div>
        ))}
      </div>
    );
  }

  if (profileQuery.isError || detailQuery.isError) {
    return (
      <div className="border-t border-rule-faint px-4 py-4">
        <p className="text-[0.9375rem] text-ink">
          계측치를 불러오지 못했습니다
        </p>
        <button
          type="button"
          onClick={() => {
            void profileQuery.refetch();
            void detailQuery.refetch();
          }}
          className="mt-3 min-h-11 border border-ink px-4 font-display text-[0.8125rem] font-semibold tracking-[0.04em] text-ink"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const profile = profileQuery.data;
  const detail = detailQuery.data;

  return (
    <dl className="grid grid-cols-2">
      <DataCell label="시가" value={formatKrw(profile.open)} />
      <DataCell label="전일종가" value={formatKrw(detail.previousClose)} />
      <DataCell label="거래량" value={`${formatCount(profile.volume)}주`} />
      <DataCell
        label="거래대금"
        value={formatCompactKrw(profile.tradingValue)}
      />
    </dl>
  );
}

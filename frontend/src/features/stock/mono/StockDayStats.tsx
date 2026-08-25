// DIRECTION: mono (S15P21A101-95)

import { formatCount, formatKrw } from '@/shared/lib/formatNumber';
import { Skeleton } from '@/shared/ui/mono/Skeleton';
import { StatCell } from '@/shared/ui/mono/StatCell';

import { useStockProfile } from '../api/useStockDetail';

type StockDayStatsProps = {
  stockCode: string;
};

/**
 * 오늘 하루의 수치 넷. 차트 바로 아래에 붙는다.
 *
 * 차트와 같은 카드 안에 두는 이유는 둘이 같은 것을 말하기 때문이다 —
 * 차트가 형태로 보여준 하루를 숫자로 한 번 적는다. 따로 떼면 카드가 하나 늘고,
 * 3D 카드는 플랫 카드보다 존재감이 커서 늘어나는 값이 더 비싸다.
 *
 * **넷만 남겼다.** 전일종가는 현재가에서 등락액을 빼면 나오고, 거래대금은
 * 거래량이 이미 말한 것을 원 단위로 다시 말한다. 시가총액·PER·PBR 은
 * 하루의 수치가 아니라 기업의 수치라 `기업` 탭에 있다.
 */
export function StockDayStats({ stockCode }: StockDayStatsProps) {
  const { data, isPending, isError } = useStockProfile(stockCode);

  if (isPending) {
    // 실제 격자와 같은 칸 수·같은 높이를 차지한다.
    return (
      <dl className="mono-grid-2">
        {[0, 1, 2, 3].map((cell) => (
          <div key={cell}>
            <Skeleton className="mono-skeleton-label" />
            <Skeleton className="mono-skeleton-value" />
          </div>
        ))}
      </dl>
    );
  }

  if (isError) {
    // 차트가 살아 있으면 화면은 쓸 수 있다. 이 넷은 조용히 비운다 —
    // 같은 카드 안에서 재시도 버튼이 두 개 보이면 무엇을 다시 받는지 헷갈린다.
    return null;
  }

  return (
    <dl className="mono-grid-2">
      <StatCell label="시가" value={formatKrw(data.open)} />
      <StatCell label="고가" value={formatKrw(data.high)} />
      <StatCell label="저가" value={formatKrw(data.low)} />
      <StatCell label="거래량" value={`${formatCount(data.volume)}주`} />
    </dl>
  );
}

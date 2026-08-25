// DIRECTION: character (S15P21A101-93)

import {
  formatCompactKrw,
  formatCount,
  formatDecimal,
  formatKrw,
} from '@/shared/lib/formatNumber';
import { Button } from '@/shared/ui/character/Button';
import { InfoRow } from '@/shared/ui/character/InfoRow';
import { SectionCard } from '@/shared/ui/character/SectionCard';
import { Skeleton } from '@/shared/ui/character/Skeleton';

import { useStockProfile } from '../api/useStockDetail';

type StockProfileListProps = {
  stockCode: string;
};

/**
 * 기업 정보 패널. props 는 애플 방향과 같다.
 *
 * PER·PBR 같은 지표에 색을 칠하지 않는다. 신호색은 등락에만 쓰는 색이고
 * 여기까지 번지면 화면 어디를 봐도 색이 무슨 뜻인지 알 수 없게 된다.
 * 52주 최고·최저도 먹색이다 — 그 둘은 등락이 아니라 범위다.
 */
export function StockProfileList({ stockCode }: StockProfileListProps) {
  const { data, isPending, isError, refetch, isFetching } =
    useStockProfile(stockCode);

  if (isPending) {
    return (
      <SectionCard>
        <div className="space-y-4">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
            <Skeleton key={row} className="h-4" />
          ))}
        </div>
      </SectionCard>
    );
  }

  if (isError) {
    return (
      <SectionCard>
        <div className="py-6 text-center">
          <p className="text-[1.0625rem] text-[var(--character-text)]">
            기업 정보를 불러오지 못했습니다
          </p>
          <div className="mt-4">
            <Button onClick={() => void refetch()} isDisabled={isFetching}>
              다시 시도
            </Button>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <dl>
        <InfoRow label="업종" value={data.sector} />
        <InfoRow label="시가총액" value={formatCompactKrw(data.marketCap)} />
        <InfoRow
          label="상장주식수"
          value={`${formatCount(data.listedShares)}주`}
        />
        <InfoRow label="PER" value={`${formatDecimal(data.per, 1)}배`} />
        <InfoRow label="PBR" value={`${formatDecimal(data.pbr, 2)}배`} />
        <InfoRow label="EPS" value={formatKrw(data.eps)} />
        <InfoRow label="BPS" value={formatKrw(data.bps)} />
        <InfoRow label="52주 최고" value={formatKrw(data.week52High)} />
        <InfoRow label="52주 최저" value={formatKrw(data.week52Low)} />
      </dl>
    </SectionCard>
  );
}

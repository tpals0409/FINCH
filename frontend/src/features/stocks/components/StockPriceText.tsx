import {
  formatKrw,
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import type { KrwAmount, Percent } from '@/shared/types/primitives';
import { RollingValue } from '@/shared/ui/RollingValue';
import { SupportingText } from '@/shared/ui/SupportingText';

const DIRECTION_CLASS = {
  rise: 'text-fg-up',
  fall: 'text-fg-down',
  flat: 'text-fg-flat',
} as const;

/**
 * 목록 한 줄의 가격 영역. 검색 결과 · 관심 종목 · 최근 본 종목이 같이 쓴다.
 *
 * **`StockSummary` 가 아니라 값 두 개만 받는다.** 시세를 실어 나르는 응답이 셋인데
 * (apiSpec §5.1 · §5.4 · §6.3) 모양이 조금씩 달라서, 타입 하나에 묶으면 나머지 둘이
 * 자기 것으로 변환해 넘겨야 한다.
 *
 * **값이 없으면 "시세 없음" 이다. 스켈레톤이 아니다.** 시세 캐시에 수신 이력이 없는 것은
 * 로딩이 아니라 확정된 상태라(apiSpec §5.4 "값 없음"), 스피너를 띄우면 영원히 돈다.
 * 시세 수집이 붙기 전에는 전 종목이 이 상태다.
 *
 * 등락 색은 국내 관례다 — **상승 적색, 하락 청색.** 미국식과 반대다.
 */
export function StockPriceText({
  currentPrice,
  changeRate,
}: {
  currentPrice: KrwAmount | null;
  changeRate: Percent | null;
}) {
  if (currentPrice === null || changeRate === null) {
    return <SupportingText as="span">시세 없음</SupportingText>;
  }

  const direction = getPriceDirection(changeRate);
  const directionClass = DIRECTION_CLASS[direction];

  return (
    <span className="flex flex-col items-end">
      <span className="text-body-1 text-fg-neutral tabular-nums">
        <RollingValue
          value={formatKrw(currentPrice)}
          numericValue={Math.round(currentPrice)}
          format={{ maximumFractionDigits: 0, useGrouping: true }}
          suffix="원"
          flashClasses={DIRECTION_CLASS}
        />
      </span>
      <span className={`text-body-2 tabular-nums ${directionClass}`}>
        <RollingValue
          value={formatSignedPercent(changeRate)}
          numericValue={changeRate}
          format={{
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            signDisplay: 'exceptZero',
            useGrouping: false,
          }}
          suffix="%"
        />
      </span>
    </span>
  );
}

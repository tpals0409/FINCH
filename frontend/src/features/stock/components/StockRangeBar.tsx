import {
  formatKrw,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';

type StockRangeBarProps = {
  low: number;
  high: number;
  previousClose: number;
  currentPrice: number;
};

/** 막대 채움은 텍스트가 아니라 도형이라 `-ink` 계열을 쓰지 않는다. */
const DIRECTION_FILL_CLASS: Record<PriceDirection, string> = {
  rise: 'bg-rise',
  fall: 'bg-fall',
  flat: 'bg-flat',
};

/**
 * 일중 범위 막대. 등락 사중 부호화의 네 번째 채널이다.
 *
 * 채움은 전일종가에서 현재가까지 뻗고, 길이가 등락폭의 크기를 그대로 나타낸다.
 * 색을 못 보는 사용자에게도 **어느 쪽으로 얼마나** 움직였는지가 길이와 방향으로 남는다.
 *
 * 축의 양끝은 일중 저가·고가지만, 갭 상승·하락이면 전일종가가 그 밖으로 나갈 수 있다.
 * 그래서 축을 저가·고가로 고정하지 않고 전일종가까지 포함해 넓힌다.
 * 고정하면 채움이 막대를 벗어나 잘린다.
 */
export function StockRangeBar({
  low,
  high,
  previousClose,
  currentPrice,
}: StockRangeBarProps) {
  const axisLow = Math.min(low, previousClose, currentPrice);
  const axisHigh = Math.max(high, previousClose, currentPrice);
  const span = axisHigh - axisLow;

  const toPercent = (value: number) =>
    span === 0 ? 50 : ((value - axisLow) / span) * 100;

  const previousPercent = toPercent(previousClose);
  const currentPercent = toPercent(currentPrice);
  const direction = getPriceDirection(currentPrice - previousClose);

  return (
    <div>
      <div
        className="relative h-2.5 bg-rule-faint"
        role="img"
        aria-label={`일중 저가 ${formatKrw(low)}, 고가 ${formatKrw(high)}, 전일종가 ${formatKrw(previousClose)} 대비 현재가 ${formatKrw(currentPrice)}`}
      >
        {/* 전일종가에서 현재가까지의 채움. 방향과 크기를 함께 담는다. */}
        <div
          className={`absolute inset-y-0 ${DIRECTION_FILL_CLASS[direction]}`}
          style={{
            left: `${Math.min(previousPercent, currentPercent)}%`,
            width: `${Math.abs(currentPercent - previousPercent)}%`,
          }}
        />
        {/* 전일종가 기준선. 채움이 어디서 출발했는지 없으면 길이를 읽을 수 없다. */}
        <div
          className="absolute inset-y-0 w-px bg-ink-muted"
          style={{ left: `${previousPercent}%` }}
        />
        {/* 현재가 지표. 지면에서 가장 진한 먹으로 찍어 눈이 먼저 닿게 한다. */}
        <div
          className="absolute -inset-y-1 w-0.5 bg-ink"
          style={{ left: `calc(${currentPercent}% - 1px)` }}
        />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between font-mono text-[0.6875rem] text-ink-muted">
        <span>저 {formatKrw(low)}</span>
        <span>고 {formatKrw(high)}</span>
      </div>
    </div>
  );
}

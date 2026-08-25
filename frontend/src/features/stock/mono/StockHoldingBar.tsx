// DIRECTION: mono (S15P21A101-95)

import {
  formatCount,
  formatKrw,
  formatSignedChangeRate,
  formatSignedKrw,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { DirectionMark } from '@/shared/ui/mono/DirectionMark';

import { useMonoStockDetail } from './api/useMonoStockDetail';
import type { MonoMockOverride } from './model/monoMock';

type StockHoldingBarProps = {
  stockCode: string;
  mockOverride: MonoMockOverride;
};

const DIRECTION_CLASS: Record<PriceDirection, string> = {
  rise: 'mono-dir-rise',
  fall: 'mono-dir-fall',
  flat: 'mono-dir-flat',
};

/**
 * 상단에 고정되는 내 보유 요약 줄.
 *
 * 보유 중인 사용자가 이 화면에 온 이유는 대개 "내 것이 지금 얼마인가"다.
 * 그 값이 가변 높이 탭 패널 뒤에 있으면 스크롤해야만 보인다. 한 줄로 줄여
 * 표제부 바로 아래에 붙이고 스크롤해도 남게 둔다.
 *
 * **이 줄이 캐릭터가 보고 있는 값이다.** 위 표제부의 새는 이 손익의 부호로
 * 포즈가 정해진다. 그래서 둘을 세로로 붙여 놓았다 — 멀리 두면 사용자가
 * 새가 무엇을 보고 그러는지 알 방법이 없어지고, 그때 캐릭터는 장식이 된다.
 *
 * **보유하지 않으면 그리지 않는다.** `0주`로 채우면 사용자가 자기 기록이
 * 있다고 착각한다. 그 경우 캐릭터는 당일 등락을 본다.
 *
 * **카드가 아니다.** 떠오른 면으로 만들면 스크롤 중에 떠다니는 판이 되어
 * 무겁고, 아래 카드와 깊이가 경쟁한다. 지면 위 활자와 hairline 하나만 둔다.
 * 대신 서리 유리로 아래로 흐르는 내용이 비치게 한다.
 */
export function StockHoldingBar({
  stockCode,
  mockOverride,
}: StockHoldingBarProps) {
  const { data } = useMonoStockDetail(stockCode, mockOverride);
  const holding = data?.holding;

  if (holding === undefined || holding === null) {
    return null;
  }

  const direction = getPriceDirection(holding.evaluationProfitRate);

  return (
    <section aria-label="내 보유 요약" className="mono-holding-bar">
      <div className="mono-holding-inner">
        {/* 수량·평균 단가는 보조 활자다. "평균"은 시각적으로 뺐다 — 옆에
            수량이 있고 오른쪽에 손익이 있어 단가로 읽힌다. 스크린 리더에는
            남긴다. `min-width: 0` 이 없으면 flex 항목이 줄지 않고 오른쪽
            손익을 밀어낸다. */}
        <p className="mono-meta mono-fg-muted mono-truncate">
          {formatCount(holding.quantity)}주 ·{' '}
          <span className="mono-sr-only">평균 </span>
          {formatKrw(holding.avgBuyPrice)}
        </p>

        {/* 평가손익도 삼중 부호화한다 — 색 · 부호 · 삼각형.
            금액이 길어져도(`-1,234,567원`) 두 줄로 넘어가면 고정의 값어치가
            없어지므로 이쪽은 줄이지 않는다. */}
        <p
          className={`mono-note mono-strong mono-holding-profit ${DIRECTION_CLASS[direction]}`}
        >
          <span className="mono-sr-only">평가손익</span>
          <DirectionMark direction={direction} size={9} />
          <span>{formatSignedKrw(holding.evaluationProfit)}</span>
          <span>{formatSignedChangeRate(holding.evaluationProfitRate)}</span>
        </p>
      </div>
    </section>
  );
}

// DIRECTION: character (S15P21A101-93)

import {
  formatCount,
  formatKrw,
  formatSignedChangeRate,
  formatSignedKrw,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { DirectionMark } from '@/shared/ui/DirectionMark';

import { useStockDetail } from '../api/useStockDetail';

type StockHoldingBarProps = {
  stockCode: string;
};

/** 신호색은 수치에만 쓴다. */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-[var(--character-rise)]',
  fall: 'text-[var(--character-fall)]',
  flat: 'text-[var(--character-text-muted)]',
};

/**
 * 상단에 고정되는 내 보유 요약 줄.
 *
 * 보유 중인 사용자가 이 화면에 온 이유는 대개 "내 것이 지금 얼마인가"다.
 * 그 값이 가변 높이 탭 패널 뒤에 있으면 스크롤해야만 보인다. 한 줄로 줄여
 * 표제부 아래에 붙이고 스크롤해도 남게 둔다.
 *
 * **보유하지 않으면 그리지 않는다.** `0주`로 채우면 사용자가 자기 기록이
 * 있다고 착각한다.
 *
 * **여기에 새를 두지 않는다.** 이 줄은 스크롤 내내 화면에 남는 자리라,
 * 새를 넣으면 어느 화면을 봐도 새가 따라다니게 되고 그때부터 캐릭터가
 * 분위기가 아니라 소음이 된다. 이 화면에서 새가 서는 곳은 표제부와 AI
 * 슬롯 둘뿐이고, 둘 다 스크롤과 함께 지나간다.
 *
 * **카드가 아니다.** 지면 위 활자와 아래 경계선 1px 만 둔다. 대신 주문 바와
 * 같은 서리 유리로, 아래로 흐르는 내용이 비치게 한다.
 */
export function StockHoldingBar({ stockCode }: StockHoldingBarProps) {
  const { data } = useStockDetail(stockCode);
  const holding = data?.holding;

  if (holding === undefined || holding === null) {
    return null;
  }

  const direction = getPriceDirection(holding.evaluationProfitRate);

  return (
    <section
      aria-label="내 보유 요약"
      /* `--character-nav-height` 는 머리단 높이(44px + 경계선 1px)다.
         머리단도 고정이라 0 으로 두면 두 줄이 겹친다. */
      className="character-bar sticky z-10 border-b border-[var(--character-border)] px-5"
      style={{ top: 'var(--character-nav-height)' }}
    >
      <div className="flex items-center justify-between gap-3 py-2.5">
        {/* 수량·평균 단가는 보조 활자다. "평균"은 시각적으로 뺐다 — 옆에
            수량이 있고 오른쪽에 손익이 있어 단가로 읽힌다. 스크린 리더에는
            sr-only 로 남긴다. `min-w-0` 이 없으면 flex 항목의 자동 최소
            너비 때문에 줄지 않고 오른쪽 손익을 밀어낸다. */}
        <p className="min-w-0 truncate text-[0.8125rem] text-[var(--character-text-muted)]">
          {formatCount(holding.quantity)}주 ·{' '}
          <span className="sr-only">평균 </span>
          {formatKrw(holding.avgBuyPrice)}
        </p>

        {/* 평가손익도 삼중 부호화한다 — 색 · 부호 · 삼각형.
            이 값의 부호가 표제부의 새 색을 정한다 (`useFinchMood`). */}
        <p
          className={`flex shrink-0 items-center gap-2 text-[0.9375rem] font-semibold whitespace-nowrap ${DIRECTION_TEXT_CLASS[direction]}`}
        >
          <span className="sr-only">평가손익</span>
          <DirectionMark direction={direction} size={9} />
          <span>{formatSignedKrw(holding.evaluationProfit)}</span>
          <span>{formatSignedChangeRate(holding.evaluationProfitRate)}</span>
        </p>
      </div>
    </section>
  );
}

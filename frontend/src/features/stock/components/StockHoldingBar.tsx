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

/** 신호색은 수치에만 쓴다. 이 줄에 액센트 청이 등장하면 규율 위반이다. */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-rise',
  fall: 'text-fall',
  flat: 'text-flat',
};

/**
 * 상단에 고정되는 내 보유 요약 줄.
 *
 * 보유 중인 사용자가 이 화면에 온 이유는 대개 "내 것이 지금 얼마인가"다.
 * 그 값이 가변 높이 탭 패널 뒤에 있으면 스크롤해야만 보인다. 한 줄로 줄여
 * 표제부 바로 아래에 붙이고 스크롤해도 남게 둔다.
 *
 * **보유하지 않으면 그리지 않는다.** `0주`로 채우면 사용자가 자기 기록이
 * 있다고 착각한다 — 아래 `StockHoldingSummary` 카드와 같은 판정이다.
 *
 * **카드가 아니다.** 배경 단차·테두리·그림자 세 겹을 여기 얹으면 스크롤 중에
 * 떠다니는 상자가 되어 무겁다. 지면 위 활자와 아래 경계선 1px 만 둔다.
 * 대신 주문 바와 같은 서리 유리로, 아래로 흐르는 내용이 비치게 한다.
 * 불투명하면 스크롤 중에 내용이 잘린 것처럼 보인다.
 *
 * **이 줄에 액센트 청을 쓰지 않는다.** 링크로도 버튼으로도 만들지 않는다.
 * 이 줄을 상단에 두는 이유가 바로 색을 위치로 가르기 위해서다 — 위쪽은
 * 신호색 구역(현재가 등락·내 평가손익), 아래쪽은 액센트 구역(주문 버튼).
 * 여기에 조작을 얹는 순간 두 청색이 다시 한 시야에 들어온다.
 *
 * 아래 `StockHoldingSummary` 카드와 중복이 아니라 밀도 차이다. 이 줄은
 * 평가손익 하나만, 카드는 수량·평균 단가까지 본다. 다만 같은 값을 읽으므로
 * 포매터는 양쪽 모두 `shared/lib/formatNumber` 것을 그대로 쓴다.
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
      /* `top-nav` 는 머리단 높이(44px + 경계선 1px)다. 머리단도 고정이라
         0 으로 두면 두 줄이 겹친다. 값은 `styles/index.css` 에 있다. */
      className="sticky top-nav z-10 border-b border-border bg-ground/80 px-5 backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="flex items-center justify-between gap-3 py-2.5">
        {/* 수량·평균 단가는 보조 활자다. 좁은 폭에서 자리가 모자라면 이쪽이
            먼저 줄어든다 — 같은 값이 아래 카드에 온전히 남아 있다.
            `min-w-0` 이 없으면 flex 항목의 자동 최소 너비 때문에 줄지 않고
            오른쪽 손익을 밀어낸다. */}
        <p className="min-w-0 truncate text-meta text-text-muted">
          {formatCount(holding.quantity)}주 · 평균{' '}
          {formatKrw(holding.avgBuyPrice)}
        </p>

        {/* 평가손익도 삼중 부호화한다 — 색 · 부호 · 삼각형. 이 화면은 청색이
            두 뜻이라 색 하나만으로 말하면 실패할 수 있다.
            금액이 길어져도(`-1,234,567원`) 두 줄로 넘어가면 고정의 값어치가
            없어지므로 이쪽은 줄이지 않는다. */}
        <p
          className={`flex shrink-0 items-center gap-2 text-note font-semibold whitespace-nowrap ${DIRECTION_TEXT_CLASS[direction]}`}
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

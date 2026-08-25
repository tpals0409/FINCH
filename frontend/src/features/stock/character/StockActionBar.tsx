// DIRECTION: character (S15P21A101-93)

import { Link } from 'react-router-dom';

import { useStockDetail } from '../api/useStockDetail';

type StockActionBarProps = {
  stockCode: string;
};

/**
 * 하단 고정 주문 바. props 는 애플 방향과 같다.
 *
 * **화면에서 채워진 요소는 이 버튼 하나뿐이다.** 채움이 둘이면 사용자가
 * 무엇이 주 액션인지 고르게 된다. 관심 등록은 상단 머리단에 있다.
 *
 * 채움색이 먹이다. 애플 방향은 액센트 청 채움이라 하락 청과 한 화면에 있는
 * 것을 거리로 벌려야 했는데, 이 방향은 조작색이 아예 무채색이라 그 계산이
 * 필요 없다. 화면에 남는 청색은 하락 하나뿐이다.
 *
 * **여기에도 새를 두지 않는다.** 주문은 이 화면에서 가장 무거운 조작이고,
 * 되돌릴 수 없는 돈이 움직이는 자리다. 그 버튼 옆에서 새가 웃고 있으면
 * 제품이 그 무게를 모르는 것처럼 보인다. 귀여운 새가 있는 증권 앱이지,
 * 새가 주문을 권하는 게임이 아니다.
 *
 * 서리 유리로 스크롤되는 내용 위에 얹는다. 불투명하게 두면 마지막 내용이
 * 바 뒤에서 잘려 더 있는지 없는지 알 수 없다.
 *
 * `env(safe-area-inset-bottom)` 을 반영한다. 노치 기기에서 버튼 아래가 잘린다.
 */
export function StockActionBar({ stockCode }: StockActionBarProps) {
  const { data } = useStockDetail(stockCode);
  const isSuspended = data?.suspended ?? false;

  return (
    <div className="character-bar fixed inset-x-0 bottom-0 z-10 border-t border-[var(--character-border)]">
      <div className="mx-auto w-full max-w-[28rem] px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {isSuspended ? (
          /* 거래정지 종목은 주문 진입을 막는다 (계약 C46). 비활성 버튼만 두면
             사용자가 왜 안 눌리는지 모르고 기다리므로 사유를 문장으로 적는다. */
          <p className="flex min-h-13 items-center justify-center rounded-full border border-[var(--character-border)] bg-[var(--character-sunken)] px-5 text-center text-[0.9375rem] font-medium text-[var(--character-text-muted)]">
            거래정지 종목은 주문할 수 없습니다
          </p>
        ) : (
          /* 주문 화면은 `side` 를 URL 에 들고 간다 (IA §2). 매수로 들어간다. */
          <Link
            to={`/stocks/${stockCode}/order?side=buy`}
            className="flex min-h-13 items-center justify-center rounded-full bg-[var(--character-accent-solid)] text-[1.0625rem] font-semibold text-[var(--character-accent-on-solid)] transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100"
          >
            주문하기
          </Link>
        )}
      </div>
    </div>
  );
}

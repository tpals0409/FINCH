import { Link } from 'react-router-dom';

import { useStockDetail } from '../api/useStockDetail';

type StockActionBarProps = {
  stockCode: string;
};

/**
 * 하단 고정 주문 바.
 *
 * **화면에서 액센트 청으로 채워진 요소는 이 버튼 하나뿐이다.** 채움이 둘이면
 * 사용자가 무엇이 주 액션인지 고르게 된다. 관심 등록은 상단 머리단으로 옮겨
 * 이 바가 버튼 하나만 갖게 했다.
 *
 * 이 버튼(액센트 청)과 현재가 등락(하락 청)이 이 화면의 가장 큰 위험이다.
 * 세로로 멀리 떼어 둔다 — 표제부와 이 바 사이에 차트 카드 한 장이 통째로
 * 들어가서, 375×667 에서 둘의 거리가 350px 을 넘는다. 여기에 색조 차이
 * (밝은 하늘빛 azure / 어두운 남빛 indigo)와 형태 차이(흰 글자를 얹은 채움 알약 /
 * 지면 위의 색 글자 + 삼각형)가 겹친다.
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
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-ground/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto w-full max-w-app px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {isSuspended ? (
          /* 거래정지 종목은 주문 진입을 막는다 (계약 C46). 비활성 버튼만 두면
             사용자가 왜 안 눌리는지 모르고 기다리므로 사유를 함께 적는다. */
          <p className="flex min-h-13 items-center justify-center rounded-full border border-border bg-surface px-5 text-center text-note font-medium text-text-muted">
            거래정지 종목은 주문할 수 없습니다
          </p>
        ) : (
          <Link
            to={`/stocks/${stockCode}/order?side=buy`}
            className="flex min-h-13 items-center justify-center rounded-full bg-accent-solid text-body font-semibold text-accent-on-solid transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100"
          >
            주문하기
          </Link>
        )}
      </div>
    </div>
  );
}

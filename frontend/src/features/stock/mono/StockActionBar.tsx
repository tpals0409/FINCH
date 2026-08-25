// DIRECTION: mono (S15P21A101-95)

import { Link } from 'react-router-dom';

import { useStockDetail } from '../api/useStockDetail';

type StockActionBarProps = {
  stockCode: string;
};

/**
 * 하단 고정 주문 바.
 *
 * **화면에서 채워진 면은 이 버튼 하나뿐이다.** 채움이 둘이면 사용자가 무엇이
 * 주 액션인지 고르게 된다. 관심 등록은 상단 머리단으로 옮겨 이 바가 버튼
 * 하나만 갖게 했다.
 *
 * 채움은 넥타이 색 계열의 먹남색이고 다크에서는 흰색으로 뒤집힌다.
 * **청색을 쓰지 않는다.** 이 방향의 캐릭터가 무채색이라 화면에서 적색과 청색이
 * 오직 등락에만 쓰이는 상태인데, 조작에 청색을 들이면 92 를 괴롭힌 "한 화면에서
 * 청색이 두 뜻을 갖는" 문제가 여기서도 생긴다. 생기지 않는 편이 낫다.
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
    <div className="mono-action-bar">
      <div className="mono-action-bar-inner">
        {isSuspended ? (
          /* 거래정지 종목은 주문 진입을 막는다 (계약 C46). 비활성 버튼만 두면
             사용자가 왜 안 눌리는지 모르고 기다리므로 사유를 함께 적는다. */
          <>
            <p
              className="mono-order-button"
              aria-disabled="true"
              style={{ opacity: 0.42 }}
            >
              주문할 수 없습니다
            </p>
            <p
              className="mono-meta mono-fg-muted"
              style={{ marginTop: '0.5rem', textAlign: 'center' }}
            >
              거래가 정지된 종목입니다
            </p>
          </>
        ) : (
          <Link
            to={`/stocks/${stockCode}/order?side=buy`}
            className="mono-order-button"
          >
            주문하기
          </Link>
        )}
      </div>
    </div>
  );
}

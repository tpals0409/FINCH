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
 * 이 버튼(액센트 청)과 하락 수치(하락 청)가 이 화면의 가장 큰 위험이다.
 * 세로로 멀리 떼어 둔다.
 *
 * 보유 요약 줄이 상단에 고정되면서 거리 계산의 근거가 바뀌었다. 전에는 표제부와
 * 이 바 사이에 차트 카드 한 장이 들어간다는 것이 근거였는데, 그건 스크롤 위치에
 * 따라 달라지는 값이다. 지금은 두 청색이 각각 고정 요소에 실려 있어서 거리가
 * 스크롤과 무관하게 일정하다 — 위쪽 하락 청은 보유 요약 줄(고정), 아래쪽 액센트
 * 청은 이 바(고정)다. 현재가 등락도 하락 청이지만 그건 스크롤되어 올라가므로
 * 최악의 경우를 정하는 쪽은 보유 요약 줄이다.
 *
 * 390×844 (iPhone 12 Pro) 기준 계산
 *   머리단        44px(터치 대상) + 1px(경계선)          하단 y =  45
 *   보유 요약 줄  20px(py-2.5) + 21px(15px×1.4) + 1px    하단 y =  87
 *   이 바         1px + 12px + 52px(min-h-13) + 12px = 77px  상단 y = 767
 *   둘의 거리 = 767 - 87 = 680px
 *
 * 안전 영역이 있는 실기기(홈 인디케이터 34px)에서는 646px, 최소 지원 폭 기기
 * 중 가장 짧은 320×568 에서는 404px 이다. 어느 쪽도 350px 아래로 내려가지
 * 않으므로 배치를 다시 보지 않는다. 350px 밑으로 내려가는 기기가 나오면 형태
 * 차이(흰 글자를 얹은 채움 알약 / 지면 위의 색 글자 + 삼각형)와 색조 차이
 * (밝은 하늘빛 azure / 어두운 남빛 indigo)만 남는데, 둘 다 색맹 사용자에게도
 * 유지되는 구분이라 그것만으로도 버틴다고 본다. 다만 그 경우 거리로 벌어 둔
 * 여유가 없어지므로, 그때는 보유 요약 줄을 먹색으로 내리는 쪽을 먼저 검토한다.
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

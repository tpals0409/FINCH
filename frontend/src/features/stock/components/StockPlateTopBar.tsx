import { useNavigate } from 'react-router-dom';

/**
 * 지면의 머리단. 판면 위쪽 경계이자 화면에서 나가는 유일한 길이다.
 *
 * 전역 내비게이션 설계는 별도 티켓(0-10)이라 여기서는 되돌아가기 하나만 둔다.
 * 없으면 한 손으로 들어온 사용자가 이 화면에서 나갈 수단이 없다.
 *
 * 화살표는 그린다. 유니코드 `←` 는 서체마다 굵기와 크기가 달라 먹선 어휘와
 * 두께가 맞지 않는다.
 */
export function StockPlateTopBar() {
  const navigate = useNavigate();

  return (
    <div className="flex border-b border-rule">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="뒤로"
        className="flex size-11 items-center justify-center"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M11 3.5 5.5 9l5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="text-ink"
          />
        </svg>
      </button>
    </div>
  );
}

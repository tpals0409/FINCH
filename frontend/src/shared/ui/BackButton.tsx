import { useNavigate } from 'react-router-dom';

type BackButtonProps = {
  fallbackTo: string;
};

/**
 * 하위 화면의 상단 뒤로가기. 앱 안에서 들어온 화면은 이전 기록으로 돌아가고,
 * 주소를 직접 연 화면은 지정한 목록으로 돌아간다.
 */
export function BackButton({ fallbackTo }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackTo);
  };

  return (
    <button
      type="button"
      aria-label="뒤로 가기"
      onClick={handleClick}
      className="flex size-11 items-center justify-center rounded-md text-title-3 text-fg-neutral"
    >
      <span aria-hidden="true">←</span>
    </button>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useStockDetail } from '../api/useStockDetail';

type StockDetailNavProps = {
  stockCode: string;
};

/**
 * 관심 등록 표시. 채워지면 등록, 윤곽만 있으면 미등록이다.
 *
 * **채움색이 액센트 청이 아니라 먹이다.** 액센트 청은 조작에 쓰는 색이라
 * 규칙상 여기 써도 되지만, 이 버튼이 현재가 등락(하락 청)과 세로로 가까워서
 * 화면 상단에 청색 두 개가 나란히 서게 된다. 두 청색이 같은 시야에 들어오는
 * 자리를 만들지 않는다는 원칙이 관례보다 위다. 윤곽/채움 대비와
 * `aria-pressed` 로 상태는 충분히 전달된다.
 *
 * 유니코드 별표나 하트를 쓰지 않는다. 서체마다 글리프가 다르고, 하트는
 * 돈을 다루는 화면의 어휘가 아니다.
 */
function BookmarkGlyph({ isWatched }: { isWatched: boolean }) {
  return (
    <svg width="17" height="20" viewBox="0 0 17 20" aria-hidden="true">
      <path
        d="M3 2h11a1 1 0 0 1 1 1v14.2a.8.8 0 0 1-1.26.65L8.5 14.6l-5.24 3.25A.8.8 0 0 1 2 17.2V3a1 1 0 0 1 1-1z"
        fill={isWatched ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 화면 머리단. 나가는 길과 관심 등록 둘만 둔다.
 *
 * 종목명을 여기 적지 않는다. 바로 아래 표제가 같은 말을 더 큰 활자로 하고
 * 있어서, 머리단에 다시 적으면 첫 화면에서 같은 이름을 두 번 읽게 된다.
 *
 * 서리 유리(frosted)로 스크롤되는 내용 위에 얹는다. 불투명하게 두면 스크롤
 * 중에 머리단이 잘라 낸 자리가 빈 띠로 보인다.
 *
 * **높이를 바꾸면 `--spacing-nav` 도 함께 고친다.** 아래에 붙는 보유 요약 줄이
 * 그 토큰으로 `top` 을 잡는다. 한쪽만 고치면 두 줄이 겹치거나 사이가 빈다.
 *
 * 전역 내비게이션 설계는 별도 티켓(0-10)이라 여기서는 되돌아가기 하나만 둔다.
 * 없으면 한 손으로 들어온 사용자가 이 화면에서 나갈 수단이 없다.
 */
export function StockDetailNav({ stockCode }: StockDetailNavProps) {
  const navigate = useNavigate();
  const { data } = useStockDetail(stockCode);

  // 관심 등록 API(`POST`/`DELETE /watchlist`)는 관심 종목 티켓(2-9)에서 붙는다.
  // 지금은 화면 상태만 만들어 둔다. 뮤테이션이 들어오면 이 상태가
  // 낙관적 업데이트를 가진 뮤테이션 훅으로 바뀐다.
  //
  // 서버 값을 `useState` 초기값으로 복사하지 않는다. 첫 렌더에는 쿼리가 아직
  // 비어 있어 항상 `false` 로 굳어 버린다. 사용자가 누른 적이 있을 때만
  // 그 값이 서버 값을 덮도록 둔다.
  const [watchOverride, setWatchOverride] = useState<boolean | null>(null);
  const isWatched = watchOverride ?? data?.watched ?? false;

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-ground/72 px-1.5 backdrop-blur-xl backdrop-saturate-150">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="뒤로"
        className="flex size-11 items-center justify-center rounded-full text-text"
      >
        <svg width="11" height="19" viewBox="0 0 11 19" aria-hidden="true">
          <path
            d="M9.5 1.5 2 9.5l7.5 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <button
        type="button"
        aria-pressed={isWatched}
        aria-label={isWatched ? '관심 종목에서 빼기' : '관심 종목에 담기'}
        onClick={() => setWatchOverride(!isWatched)}
        className="flex size-11 items-center justify-center rounded-full text-text transition-transform duration-150 ease-out active:scale-90 motion-reduce:active:scale-100"
      >
        <BookmarkGlyph isWatched={isWatched} />
      </button>
    </header>
  );
}

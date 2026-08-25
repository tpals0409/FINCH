// DIRECTION: mono (S15P21A101-95)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useStockDetail } from '../api/useStockDetail';

type StockDetailNavProps = {
  stockCode: string;
};

/**
 * 관심 등록 표시. 채워지면 등록, 윤곽만 있으면 미등록이다.
 *
 * 채움색은 먹이다. 이 방향에서 적색과 청색은 등락 전용이므로 조작에 쓸 색이
 * 애초에 없다 — 그게 이 방향의 이점이고, 지키는 방법은 색을 만들지 않는 것이다.
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
 * 서리 유리로 스크롤되는 내용 위에 얹는다. 불투명하게 두면 스크롤 중에
 * 머리단이 잘라 낸 자리가 빈 띠로 보인다.
 *
 * **머리단은 떠오르지 않는다.** 그림자를 주면 화면 맨 위에 떠 있는 판이 생기고,
 * 아래 카드들과 깊이가 경쟁한다. 이 방향에서 떠 있는 것은 카드·고른 칸·주문
 * 버튼뿐이다. 머리단은 지면의 일부이고 아래 hairline 하나로만 끝난다.
 *
 * **높이를 바꾸면 `.mono-holding-bar` 의 `top` 도 함께 고친다.** 아래에 붙는
 * 보유 요약 줄이 그 값으로 자리를 잡는다. 한쪽만 고치면 두 줄이 겹친다.
 */
export function StockDetailNav({ stockCode }: StockDetailNavProps) {
  const navigate = useNavigate();
  const { data } = useStockDetail(stockCode);

  // 관심 등록 API 는 관심 종목 티켓(2-9)에서 붙는다. 지금은 화면 상태만 만든다.
  // 서버 값을 `useState` 초기값으로 복사하지 않는다 — 첫 렌더에는 쿼리가 아직
  // 비어 있어 항상 `false` 로 굳어 버린다.
  const [watchOverride, setWatchOverride] = useState<boolean | null>(null);
  const isWatched = watchOverride ?? data?.watched ?? false;

  return (
    <header className="mono-nav">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="뒤로"
        className="mono-icon-button"
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
        className="mono-icon-button"
      >
        <BookmarkGlyph isWatched={isWatched} />
      </button>
    </header>
  );
}

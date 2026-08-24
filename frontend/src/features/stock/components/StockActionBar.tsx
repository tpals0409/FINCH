import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useStockDetail } from '../api/useStockDetail';

type StockActionBarProps = {
  stockCode: string;
};

/**
 * 관심 등록 표시. 도감의 책갈피 색인 탭 모양이다.
 *
 * 유니코드 별표나 하트를 쓰지 않는다. 서체마다 글리프가 다르고, 하트는
 * 돈을 다루는 화면의 어휘가 아니다. 등록되면 종 표지색으로 채운다.
 */
function BookmarkMark({ isWatched }: { isWatched: boolean }) {
  return (
    <svg
      width="14"
      height="16"
      viewBox="0 0 14 16"
      aria-hidden="true"
      className={isWatched ? 'text-specimen' : 'text-ink-muted'}
    >
      <path
        d="M1 1h12v14l-6-4.4L1 15z"
        fill={isWatched ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/**
 * 지면 최하단 고정 조작부.
 *
 * **주 액션은 먹색 사각 하나다.** 그라데이션도, 액센트색 버튼도, 라운드도 없다.
 * 왼쪽 관심 등록은 테두리만 있는 칸이라 무게를 다투지 않는다.
 *
 * `env(safe-area-inset-bottom)` 을 반영한다. 노치 기기에서 버튼 아래가 잘린다.
 * 최소 44×44px 터치 대상을 넘기려고 높이를 56px 로 잡았다.
 */
export function StockActionBar({ stockCode }: StockActionBarProps) {
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

  const isSuspended = data?.suspended ?? false;

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-rule bg-ground">
      <div className="mx-auto flex w-full max-w-plate pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          aria-pressed={isWatched}
          onClick={() => setWatchOverride(!isWatched)}
          className="flex min-h-14 shrink-0 flex-col items-center justify-center gap-1 border-r border-rule px-4"
        >
          <BookmarkMark isWatched={isWatched} />
          <span className="font-display text-[0.6875rem] tracking-[0.06em] text-ink-muted">
            관심
          </span>
        </button>

        {isSuspended ? (
          /* 거래정지 종목은 주문 진입을 막는다 (계약 C46). 비활성 버튼만 두면
             사용자가 왜 안 눌리는지 모르고 기다리므로 사유를 함께 적는다. */
          <p className="flex min-h-14 flex-1 items-center justify-center px-4 text-center font-display text-sm font-medium text-ink-muted">
            거래정지 종목은 주문할 수 없습니다
          </p>
        ) : (
          <Link
            to={`/stocks/${stockCode}/order?side=buy`}
            className="flex min-h-14 flex-1 items-center justify-center bg-ink font-display text-base font-semibold tracking-[0.02em] text-ground"
          >
            주문하기
          </Link>
        )}
      </div>
    </div>
  );
}

// DIRECTION: character (S15P21A101-93)

import { formatKstDateTime } from '@/shared/lib/formatDate';
import {
  formatCount,
  formatKrw,
  formatSignedChangeRate,
  formatSignedKrw,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { Button } from '@/shared/ui/character/Button';
import { FinchImage } from '@/shared/ui/character/FinchImage';
import { Skeleton } from '@/shared/ui/character/Skeleton';
import { SpeechBubble } from '@/shared/ui/character/SpeechBubble';
import { DirectionMark } from '@/shared/ui/DirectionMark';

import { useStockDetail } from '../api/useStockDetail';
import type { StockDetail } from '../model/stockDetail';

import { useFinchMood } from './useFinchMood';

type StockQuoteHeaderProps = {
  stockCode: string;
};

/** 신호색은 수치에만 쓴다. 버튼·링크에 이 클래스가 붙으면 규율 위반이다. */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-[var(--character-rise)]',
  fall: 'text-[var(--character-fall)]',
  flat: 'text-[var(--character-text-muted)]',
};

/**
 * 새가 할 말을 고른다.
 *
 * **새를 정한 바로 그 값을 문장으로 말한다** (`useFinchMood` 와 같은 판정
 * 순서다). 보유 중이면 평가손익, 미보유면 당일 등락이다. 다른 값을 말하면
 * 사용자가 새의 색이 무엇을 가리키는지 알 수 없게 된다.
 *
 * 여기서 처음 나오는 수치는 없다. 평가손익은 아래 보유 요약 줄에, 등락액은
 * 바로 위 등락 줄에 이미 있다. 말풍선은 화면에 있는 값을 한국어로 한 번 더
 * 말하는 자리이지 정보원이 아니다.
 */
function buildFinchLine(detail: StockDetail): string {
  const holding = detail.holding;

  if (holding !== null) {
    if (holding.evaluationProfit > 0) {
      return `내 평가손익은 ${formatSignedKrw(holding.evaluationProfit)}, 아직 이익 구간이에요`;
    }
    if (holding.evaluationProfit < 0) {
      return `내 평가손익은 ${formatSignedKrw(holding.evaluationProfit)}, 지금은 손실 구간이에요`;
    }
    return '내 평가손익은 지금 딱 0원이에요';
  }

  if (detail.changeAmount > 0) {
    return `어제보다 ${formatKrw(Math.abs(detail.changeAmount))} 올랐어요`;
  }
  if (detail.changeAmount < 0) {
    return `어제보다 ${formatKrw(Math.abs(detail.changeAmount))} 내렸어요`;
  }
  return '어제와 같은 가격이에요';
}

/**
 * 화면 표제부. 종목명 · 6자리 코드 · 현재가 · 등락 · 그리고 새 한 마리.
 *
 * **카드에 담지 않는다.** 크림 지면 위에 활자만 놓고, 새는 그 지면에 선다.
 * 카드가 지면을 다 덮으면 새가 설 자리가 없다 — 이 방향에서 크림 여백은
 * 남는 자리가 아니라 캐릭터의 자리다.
 *
 * **현재가는 먹색이고 이 화면의 최대 활자다.** 등락의 적/청은 변화량 줄에만
 * 실린다. 캐릭터가 아무리 커도 가장 먼저 눈에 들어오는 것은 숫자여야 한다 —
 * 새는 활자 크기로도 위계로도 현재가 아래다.
 *
 * 새 뒤에 후광을 깐다. 기분에 따라 분홍/파랑으로 갈리지만 **지면 전체를
 * 물들이지 않는다.** 수치는 언제나 크림 위에 남아야 대비 계산이 유지된다.
 * (후광면 위에 올라가는 활자의 대비도 토큰 파일에서 함께 계산해 두었다.)
 *
 * 표제부에 `overflow-hidden` 을 건다. 후광이 오른쪽 화면 밖으로 넘치게 두면
 * 문서 폭이 뷰포트보다 넓어진다. `index.css` 의 `overflow-x: hidden` 이 가로
 * 스크롤바는 막아 주지만 그건 증상을 가리는 것이고, 가로 스크롤은 버그로 본다
 * (컨벤션 §8). 넘치는 것을 여기서 잘라 문서 폭을 뷰포트에 맞춘다.
 *
 * 순서가 곧 읽는 순서다 — 무엇인가(종목명) → 얼마인가(현재가) → 어느 쪽으로
 * 움직였나(등락) → 언제 기준인가(시각) → 그래서 내 상황은(말풍선).
 * 새의 말이 마지막인 이유는, 그 말이 앞의 숫자를 대신하는 것이 아니라
 * 요약하는 것이기 때문이다.
 */
export function StockQuoteHeader({ stockCode }: StockQuoteHeaderProps) {
  const detailQuery = useStockDetail(stockCode);
  const bird = useFinchMood(stockCode);

  if (detailQuery.isPending) {
    // 스켈레톤은 실제 표제부와 같은 높이를 차지한다. 크기가 다르면 데이터가
    // 도착할 때 아래 구획이 통째로 밀린다. 새 자리도 함께 비워 둔다.
    return (
      <div className="px-5 pt-2 pb-6">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-2 h-4 w-28" />
        <Skeleton className="mt-5 h-12 w-52" />
        <Skeleton className="mt-3 h-5 w-40" />
        <Skeleton className="mt-3.5 h-4 w-32" />
        <div className="mt-5 flex items-end gap-3">
          <Skeleton className="h-16 flex-1 rounded-[18px]" />
          <Skeleton className="h-[clamp(5.5rem,26vw,7rem)] w-[clamp(4.5rem,22vw,6rem)] rounded-[28px]" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="px-5 pt-2 pb-6">
        <p className="text-[1.0625rem] text-[var(--character-text)]">
          시세를 불러오지 못했습니다
        </p>
        <div className="mt-4">
          <Button
            onClick={() => void detailQuery.refetch()}
            isDisabled={detailQuery.isFetching}
          >
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  const detail = detailQuery.data;
  const direction = getPriceDirection(detail.changeRate);

  return (
    <div className="character-settle relative overflow-hidden px-5 pt-2 pb-6">
      {/* 후광은 새 뒤에만 깔린다. 수치가 있는 왼쪽까지 번지지 않게 오른쪽
          아래로 밀어 둔다. 클릭을 먹지 않게 `pointer-events-none` 을 준다. */}
      <div
        aria-hidden="true"
        data-mood={bird}
        className="character-halo pointer-events-none absolute right-[-2rem] bottom-[-1rem] h-64 w-64"
      />

      <div className="relative">
        <h1 className="text-[clamp(1.375rem,6vw,1.625rem)] leading-[1.2] font-semibold tracking-[-0.015em] text-[var(--character-text)]">
          {detail.stockName}
        </h1>

        {/* 종목코드는 6자리 문자열이고 숫자로 다루지 않는다. 모노로 두면
            사람이 쓴 이름과 기계가 쓰는 식별자가 형태로 갈린다. */}
        <p className="mt-1 font-[family-name:var(--character-font-mono)] text-[0.8125rem] text-[var(--character-text-muted)]">
          {detail.stockCode} · {detail.market}
        </p>

        {detail.suspended ? (
          /* 거래정지는 뱃지 + 사유를 노출하고 주문 진입을 막는다 (계약 C46).
             목 데이터는 `suspended: false` 라 화면에는 안 보이지만, 실제 응답이
             붙는 날 이 분기가 없으면 정지 종목을 살 수 있게 된다. */
          <p className="mt-3 inline-flex rounded-full border border-[var(--character-border)] bg-[var(--character-sunken)] px-3 py-1 text-[0.8125rem] font-medium text-[var(--character-text)]">
            거래정지
            {detail.suspendedReason === null
              ? null
              : ` · ${detail.suspendedReason}`}
          </p>
        ) : null}

        <p className="mt-4 flex items-baseline gap-1.5 text-[clamp(2.5rem,11.5vw,3rem)] leading-none font-semibold tracking-[-0.025em] text-[var(--character-text)]">
          {/* 단위를 문자열에 잘라 붙이지 않는다. 숫자와 단위를 따로 포매팅해
              큰 숫자 옆의 `원` 만 작게 둔다. */}
          {formatCount(detail.currentPrice)}
          <span className="text-2xl font-medium tracking-normal">원</span>
        </p>

        {/* 등락 삼중 부호화 — 색 · 부호 · 삼각형. 새의 색은 넷째 신호가
            아니라 거드는 분위기다. 새를 지워도 여기서 의미가 다 읽혀야 한다. */}
        <p
          className={`mt-2.5 flex items-center gap-2.5 text-[1.0625rem] font-semibold ${DIRECTION_TEXT_CLASS[direction]}`}
        >
          <DirectionMark direction={direction} size={11} />
          <span>{formatSignedKrw(detail.changeAmount)}</span>
          <span>{formatSignedChangeRate(detail.changeRate)}</span>
        </p>

        {/* 신선도는 `asOf` 로만 드러난다. 데이터가 늦은 상태는 정상 범위다. */}
        <p className="mt-3 font-[family-name:var(--character-font-mono)] text-[0.8125rem] text-[var(--character-text-muted)]">
          {formatKstDateTime(detail.asOf)} 기준
          {detail.stale ? ' · 시세 지연' : ''}
        </p>

        {/* 말풍선과 새는 한 덩어리다. 말풍선 꼬리가 오른쪽 새를 가리키므로
            둘의 순서를 바꾸면 꼬리가 허공을 가리킨다.
            `min-w-0` 이 없으면 flex 항목의 자동 최소 너비 때문에 말풍선이
            줄지 않고 새를 화면 밖으로 밀어낸다. */}
        <div className="mt-5 flex items-end gap-2.5">
          <div className="min-w-0 flex-1">
            <SpeechBubble>{buildFinchLine(detail)}</SpeechBubble>
          </div>
          <FinchImage
            bird={bird}
            pose="search"
            height="clamp(5.5rem, 26vw, 7rem)"
            className="character-hop shrink-0"
          />
        </div>
      </div>
    </div>
  );
}

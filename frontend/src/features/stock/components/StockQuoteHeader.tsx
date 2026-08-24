import { formatKstDateTime } from '@/shared/lib/formatDate';
import {
  formatCount,
  formatSignedChangeRate,
  formatSignedKrw,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { Button } from '@/shared/ui/Button';
import { DirectionMark } from '@/shared/ui/DirectionMark';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useStockDetail } from '../api/useStockDetail';

type StockQuoteHeaderProps = {
  stockCode: string;
};

/** 신호색은 수치에만 쓴다. 버튼·링크에 이 클래스가 붙으면 규율 위반이다. */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-rise',
  fall: 'text-fall',
  flat: 'text-flat',
};

/**
 * 화면 표제부. 종목명 · 6자리 코드 · 현재가 · 등락.
 *
 * **카드에 담지 않는다.** 지면 위에 활자만 놓는다. 위계는 상자가 아니라
 * 크기·굵기·색이 만든다 — 이 화면에서 가장 큰 활자가 현재가이고, 두 번째가
 * 종목명이고, 나머지는 다 작다. 그 순서가 곧 읽는 순서다.
 *
 * **현재가는 먹색이다.** 등락의 적/청은 변화량 쪽에만 실린다. 가장 큰 숫자를
 * 16:1 대비의 먹으로 두면 색맹·직사광선·저가형 패널 어디서도 값을 읽는 데
 * 실패하지 않는다. 신호색은 "얼마인가"가 아니라 "어느 쪽으로 움직였나"에 쓴다.
 */
export function StockQuoteHeader({ stockCode }: StockQuoteHeaderProps) {
  const detailQuery = useStockDetail(stockCode);

  if (detailQuery.isPending) {
    // 스켈레톤은 실제 표제부와 같은 높이를 차지한다. 크기가 다르면 데이터가
    // 도착할 때 아래 구획이 통째로 밀린다.
    return (
      <div className="px-5 pt-3 pb-7">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-4 w-28" />
        <Skeleton className="mt-6 h-14 w-56" />
        <Skeleton className="mt-3 h-6 w-44" />
        <Skeleton className="mt-4 h-4 w-32" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="px-5 pt-3 pb-7">
        <p className="text-body text-text">시세를 불러오지 못했습니다</p>
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
    <div className="px-5 pt-3 pb-7 motion-safe:animate-settle">
      <h1 className="text-name font-semibold text-text">{detail.stockName}</h1>

      {/* 종목코드는 6자리 문자열이고 숫자로 다루지 않는다. 모노로 두면 사람이
          쓴 이름과 기계가 쓰는 식별자가 형태로 갈린다. */}
      <p className="mt-1 font-mono text-meta text-text-muted">
        {detail.stockCode} · {detail.market}
      </p>

      {detail.suspended ? (
        /* 거래정지는 뱃지 + 사유 문구를 노출하고 주문 진입을 막는다 (계약 C46).
           목 데이터는 `suspended: false` 라서 화면에는 안 보이지만, 실제 응답이
           붙는 날 이 분기가 없으면 정지 종목을 살 수 있게 된다. */
        <p className="mt-3 inline-flex rounded-full border border-border bg-surface px-3 py-1 text-meta font-medium text-text">
          거래정지
          {detail.suspendedReason === null
            ? null
            : ` · ${detail.suspendedReason}`}
        </p>
      ) : null}

      <p className="mt-5 flex items-baseline gap-1.5 text-price font-semibold text-text">
        {/* 단위를 문자열에 잘라 붙이지 않는다. 숫자와 단위를 따로 포매팅해
            큰 숫자 옆의 `원` 만 작게 둔다. */}
        {formatCount(detail.currentPrice)}
        <span className="text-2xl font-medium tracking-normal">원</span>
      </p>

      {/* 등락 삼중 부호화 — 색 · 부호 · 삼각형. 색 하나만 쓰지 않는다.
          이 화면에는 청색이 두 뜻으로 있어서(조작/하락) 색이 실패할 수 있다. */}
      <p
        className={`mt-2 flex items-center gap-2.5 text-body font-semibold ${DIRECTION_TEXT_CLASS[direction]}`}
      >
        <DirectionMark direction={direction} size={11} />
        <span>{formatSignedKrw(detail.changeAmount)}</span>
        <span>{formatSignedChangeRate(detail.changeRate)}</span>
      </p>

      {/* 신선도는 `asOf` 로만 드러난다. 데이터가 늦은 상태는 정상 범위 안에 있다. */}
      <p className="mt-4 font-mono text-meta text-text-muted">
        {formatKstDateTime(detail.asOf)} 기준
        {detail.stale ? ' · 시세 지연' : ''}
      </p>
    </div>
  );
}

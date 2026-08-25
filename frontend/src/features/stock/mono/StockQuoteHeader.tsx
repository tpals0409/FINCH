// DIRECTION: mono (S15P21A101-95)

import { formatKstDateTime } from '@/shared/lib/formatDate';
import {
  formatCount,
  formatSignedChangeRate,
  formatSignedKrw,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { Button } from '@/shared/ui/mono/Button';
import { DirectionMark } from '@/shared/ui/mono/DirectionMark';
import { Finch, type FinchBasis } from '@/shared/ui/mono/Finch';
import { Skeleton } from '@/shared/ui/mono/Skeleton';

import { useMonoStockDetail } from './api/useMonoStockDetail';
import type { MonoMockOverride } from './model/monoMock';

type StockQuoteHeaderProps = {
  stockCode: string;
  mockOverride: MonoMockOverride;
};

const DIRECTION_CLASS: Record<PriceDirection, string> = {
  rise: 'mono-dir-rise',
  fall: 'mono-dir-fall',
  flat: 'mono-dir-flat',
};

/**
 * 화면 표제부. 종목명 · 6자리 코드 · 캐릭터 · 현재가 · 등락.
 *
 * **캐릭터가 서는 자리는 화면에서 여기 하나뿐이다.** 종목명과 코드가 두 줄을
 * 쓰고 나면 오른쪽이 비는데, 그 빈 자리를 새가 쓴다. 현재가는 그 아래에서
 * 폭을 온전히 갖는다 — 최대 활자와 캐릭터가 가로로 경쟁하지 않게 한 배치다.
 * 캐릭터를 다른 카드에도 뿌리면 화면이 장난감이 된다.
 *
 * **캐릭터가 보는 값은 이렇게 정한다.**
 *   보유 중이면  평가손익의 부호
 *   미보유면     당일 등락의 부호
 *   0 이면       보합 포즈
 *
 * 보유한 사용자가 이 화면에 온 이유는 대개 "내 것이 지금 얼마인가"이고,
 * 당일 등락은 그 답이 아니다. 오늘 내렸어도 내 평균 단가보다 위면 내 상태는
 * 이익이다. 다만 이 판정은 **가정이다** — 기능 명세가 정한 것이 아니다.
 *
 * **현재가는 먹색이다.** 등락의 적/청은 변화량 쪽에만 실린다. 가장 큰 숫자를
 * 13:1 대비의 먹으로 두면 색맹·직사광선·저가형 패널 어디서도 값을 읽는 데
 * 실패하지 않는다. 신호색은 "얼마인가"가 아니라 "어느 쪽으로 움직였나"에 쓴다.
 */
export function StockQuoteHeader({
  stockCode,
  mockOverride,
}: StockQuoteHeaderProps) {
  const detailQuery = useMonoStockDetail(stockCode, mockOverride);

  if (detailQuery.isPending) {
    // 스켈레톤은 실제 표제부와 같은 높이를 차지한다. 크기가 다르면 데이터가
    // 도착할 때 아래 구획이 통째로 밀린다. 캐릭터 자리도 비워 둔다.
    return (
      <div className="mono-header">
        <div className="mono-header-top">
          <div style={{ flex: 1 }}>
            <Skeleton className="mono-skeleton-title" />
            <Skeleton className="mono-skeleton-sub" />
          </div>
          <Skeleton className="mono-skeleton-finch mono-header-finch" />
        </div>
        <Skeleton className="mono-skeleton-price" />
        <Skeleton className="mono-skeleton-change" />
        <Skeleton className="mono-skeleton-stamp" />
      </div>
    );
  }

  if (detailQuery.isError || detailQuery.data === undefined) {
    return (
      <div className="mono-header">
        <p className="mono-body mono-fg">시세를 불러오지 못했습니다</p>
        <div style={{ marginTop: '1rem' }}>
          <Button
            onClick={detailQuery.refetch}
            isDisabled={detailQuery.isFetching}
          >
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  const detail = detailQuery.data;
  const quoteDirection = getPriceDirection(detail.changeRate);

  // 보유 중이면 평가손익, 미보유면 당일 등락. 위 주석의 판정이 이 두 줄이다.
  const finchBasis: FinchBasis = detail.holding === null ? 'quote' : 'holding';
  const finchDirection =
    detail.holding === null
      ? quoteDirection
      : getPriceDirection(detail.holding.evaluationProfitRate);

  return (
    <div className="mono-header mono-settle">
      <div className="mono-header-top">
        <div style={{ minWidth: 0 }}>
          <h1 className="mono-name mono-fg">{detail.stockName}</h1>
          {/* 종목코드는 6자리 문자열이고 숫자로 다루지 않는다. 모노로 두면
              사람이 쓴 이름과 기계가 쓰는 식별자가 형태로 갈린다. */}
          <p
            className="mono-mono mono-meta mono-fg-muted"
            style={{ marginTop: '0.25rem' }}
          >
            {detail.stockCode} · {detail.market}
          </p>
        </div>

        <span className="mono-header-finch">
          <Finch direction={finchDirection} basis={finchBasis} />
        </span>
      </div>

      {detail.suspended ? (
        /* 거래정지는 뱃지 + 사유 문구를 노출하고 주문 진입을 막는다 (계약 C46). */
        <p className="mono-badge mono-fg">
          거래정지
          {detail.suspendedReason === null
            ? null
            : ` · ${detail.suspendedReason}`}
        </p>
      ) : null}

      <p className="mono-price-row mono-price mono-fg">
        {/* 단위를 문자열에 잘라 붙이지 않는다. 숫자와 단위를 따로 포매팅해
            큰 숫자 옆의 `원` 만 작게 둔다. */}
        {formatCount(detail.currentPrice)}
        <span className="mono-price-unit">원</span>
      </p>

      {/* 등락 삼중 부호화 — 색 · 부호 · 삼각형. 색 하나만 쓰지 않는다.
          캐릭터 포즈는 네 번째 신호일 뿐이고 단독으로는 쓰이지 않는다. */}
      <p className={`mono-change-row ${DIRECTION_CLASS[quoteDirection]}`}>
        <DirectionMark direction={quoteDirection} size={11} />
        <span>{formatSignedKrw(detail.changeAmount)}</span>
        <span>{formatSignedChangeRate(detail.changeRate)}</span>
      </p>

      {/* 신선도는 `asOf` 로만 드러난다. 데이터가 늦은 상태는 정상 범위 안에 있다. */}
      <p
        className="mono-mono mono-meta mono-fg-muted"
        style={{ marginTop: '1rem' }}
      >
        {formatKstDateTime(detail.asOf)} 기준
        {detail.stale ? ' · 시세 지연' : ''}
      </p>
    </div>
  );
}

import { formatKstDateTime } from '@/shared/lib/formatDate';
import {
  formatCount,
  formatSignedChangeRate,
  formatSignedKrw,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { DirectionMark } from '@/shared/ui/DirectionMark';

import { useStockDetail, useStockProfile } from '../api/useStockDetail';

import { StockRangeBar } from './StockRangeBar';

type StockQuotePlateProps = {
  stockCode: string;
};

/** 수치 텍스트는 본문 크기라 4.5:1 을 넘는 `-ink` 계열만 쓴다. */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-rise-ink',
  fall: 'text-fall-ink',
  flat: 'text-flat',
};

/**
 * 도감 지면의 표제부.
 *
 * 학명 자리에 6자리 종목코드를 모노로 놓고, 그 아래 종명을 표제로 세운다.
 * **현재가가 이 화면에서 가장 큰 물질이다.** 그리고 먹색이다 — 등락의 적/청은
 * 변화량 쪽에만 실린다. 가장 큰 숫자를 16:1 대비의 먹으로 두면 색맹·직사광선·
 * 저가형 패널 어디서도 값을 읽는 데 실패하지 않는다.
 *
 * 시세와 일중 계측치 두 쿼리를 여기서 함께 읽는다. 막대가 저가·고가를 축으로
 * 쓰므로 둘 다 이 컴포넌트가 실제로 쓰는 데이터다. 위에서 받아 내리지 않는다.
 */
export function StockQuotePlate({ stockCode }: StockQuotePlateProps) {
  const detailQuery = useStockDetail(stockCode);
  const profileQuery = useStockProfile(stockCode);

  if (detailQuery.isPending) {
    return (
      <div className="animate-pulse px-4 pt-4 pb-4" aria-hidden="true">
        <div className="h-3 w-28 bg-rule-faint" />
        <div className="mt-3 h-7 w-40 bg-rule-faint" />
        <div className="mt-5 h-12 w-56 bg-rule-faint" />
        <div className="mt-4 h-4 w-44 bg-rule-faint" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="px-4 pt-4 pb-4">
        <p className="text-[0.9375rem] text-ink">시세를 불러오지 못했습니다</p>
        <button
          type="button"
          onClick={() => void detailQuery.refetch()}
          disabled={detailQuery.isFetching}
          className="mt-3 min-h-11 border border-ink px-4 font-display text-[0.8125rem] font-semibold tracking-[0.04em] text-ink disabled:opacity-50"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const detail = detailQuery.data;
  const direction = getPriceDirection(detail.changeRate);
  const profile = profileQuery.data;

  return (
    <div className="px-4 pt-4 pb-4 motion-safe:animate-plate-settle">
      {/* 학명 자리. 종목코드는 6자리 문자열이고 숫자로 다루지 않는다. */}
      <p className="font-mono text-[0.75rem] tracking-[0.18em] text-ink-muted">
        {detail.stockCode}
        <span className="mx-2 text-rule">/</span>
        {detail.market}
      </p>

      <h1 className="mt-1 font-display text-plate-title font-extrabold text-ink">
        {detail.stockName}
      </h1>

      {detail.suspended ? (
        /* 거래정지는 뱃지 + 사유 문구를 노출하고 주문 진입을 막는다 (계약 C46).
           목 데이터는 `suspended: false` 라서 화면에는 안 보이지만, 실제 응답이
           붙는 날 이 분기가 없으면 정지 종목을 살 수 있게 된다. */
        <p className="mt-3 inline-block border border-ink px-2 py-1 font-display text-[0.75rem] font-semibold tracking-[0.06em] text-ink">
          거래정지
          {detail.suspendedReason === null
            ? null
            : ` · ${detail.suspendedReason}`}
        </p>
      ) : null}

      <p className="mt-3 flex items-baseline gap-1 text-quote font-semibold text-ink">
        {/* 단위를 잘라 붙이지 않는다. 숫자와 단위를 따로 포매팅해
            큰 숫자 옆의 `원` 만 작게 둔다. */}
        {formatCount(detail.currentPrice)}
        <span className="text-2xl font-medium">원</span>
      </p>

      {/* 등락 사중 부호화 — 색 · 부호 · 삼각형 · 막대 길이. 색 하나만 쓰지 않는다. */}
      <p
        className={`mt-2 flex items-center gap-2 text-lg font-semibold ${DIRECTION_TEXT_CLASS[direction]}`}
      >
        <DirectionMark direction={direction} size={11} />
        <span>{formatSignedKrw(detail.changeAmount)}</span>
        <span className="text-rule-faint" aria-hidden="true">
          |
        </span>
        <span>{formatSignedChangeRate(detail.changeRate)}</span>
      </p>

      {profile === undefined ? null : (
        <div className="mt-4">
          <StockRangeBar
            low={profile.low}
            high={profile.high}
            previousClose={detail.previousClose}
            currentPrice={detail.currentPrice}
          />
        </div>
      )}

      <p className="mt-3.5 font-mono text-[0.6875rem] text-ink-muted">
        {formatKstDateTime(detail.asOf)} 기준
        {detail.stale ? ' · 시세 지연' : ''}
      </p>
    </div>
  );
}

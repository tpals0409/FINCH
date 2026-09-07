import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useCreateOrder, useOrderAvailable } from '@/features/order';
import { ROUTES, STOCK_CODE_PARAM } from '@/shared/config/routes';
import { formatKrw } from '@/shared/lib/formatNumber';
import { createIdempotencyKey } from '@/shared/lib/idempotencyKey';
import type { OrderSide } from '@/shared/types/order';
import { StockCodeSchema } from '@/shared/types/primitives';
import type { IdempotencyKey } from '@/shared/types/primitives';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';

const RATIOS = [10, 25, 50, 100] as const;

/**
 * 시장가 주문 (apiSpec §7 · featureSpec §7.3).
 *
 * **비율 버튼의 분모는 서버가 준 `maxQuantity` 다.** 화면이 `예수금 / 현재가` 를 직접 계산하면
 * 반올림 가정이 두 곳에 생기고, 어긋나면 화면이 "살 수 있다" 고 말한 주문이 체결에서 거절된다.
 *
 * **지정가가 없다.** MVP 는 시장가 즉시 체결만 있고 접수와 체결이 나뉘지 않는다 (apiSpec §7.1).
 */
export function OrderPage() {
  const params = useParams();
  const navigate = useNavigate();
  /*
   * `StockCodeGuard` 가 이 경로에 들어오기 전에 형식을 이미 검증했다 (틀리면 404 로 끊는다).
   * 그래서 여기서는 브랜드 타입으로 좁히기만 한다 — 같은 검사를 두 번 하지 않는다.
   */
  const stockCode = StockCodeSchema.parse(params[STOCK_CODE_PARAM]);

  const [side, setSide] = useState<OrderSide>('BUY');
  const [quantity, setQuantity] = useState(0);

  const available = useOrderAvailable(stockCode, side);
  const order = useCreateOrder();

  /*
   * **멱등 키는 한 번의 주문 시도에 하나다** (apiSpec §1.4).
   *
   * 같은 주문의 재시도는 같은 키여야 한다 — 새 키로 보내면 재시도가 곧 두 번째 체결이 되고,
   * 체결은 되돌릴 수 없다. 반대로 수량이나 방향을 바꾸면 다른 요청이므로 새 키를 써야 한다.
   * 같은 키에 다른 본문을 보내면 서버가 `IDEMPOTENCY_CONFLICT` 로 막는다.
   */
  const keyRef = useRef<IdempotencyKey | null>(null);
  const keyForRef = useRef('');
  const signature = `${stockCode}:${side}:${quantity}`;

  const submit = () => {
    if (keyRef.current === null || keyForRef.current !== signature) {
      keyRef.current = createIdempotencyKey();
      keyForRef.current = signature;
    }
    order.mutate(
      { body: { stockCode, side, quantity }, idempotencyKey: keyRef.current },
      // 성공하면 키를 버린다. 다음 주문은 새 시도다.
      {
        onSuccess: () => {
          keyRef.current = null;
        },
      },
    );
  };

  if (available.isPending) {
    return (
      <PageMain>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-4 h-24 w-full" />
      </PageMain>
    );
  }

  if (available.isError) {
    return (
      <PageMain>
        <Card>
          <p className="text-body-2 text-fg-neutral-subtle">
            주문 정보를 불러오지 못했습니다
          </p>
          <Button onClick={() => void available.refetch()} className="mt-3">
            다시 시도
          </Button>
        </Card>
      </PageMain>
    );
  }

  const info = available.data;
  const price = info.currentPrice;
  const overMax = quantity > info.maxQuantity;
  const canSubmit =
    info.tradable && quantity > 0 && !overMax && !order.isPending;

  return (
    <PageMain>
      <h1 className="text-title-2 text-fg-neutral">{stockCode} 주문</h1>

      <div className="mt-4 flex gap-2" role="group" aria-label="주문 방향">
        {(['BUY', 'SELL'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={side === value}
            onClick={() => {
              setSide(value);
              setQuantity(0);
            }}
            className={`flex-1 rounded-card border py-2 text-body-1 ${
              side === value
                ? 'border-stroke-neutral-contrast text-fg-neutral'
                : 'border-stroke-neutral-weak text-fg-neutral-subtle'
            }`}
          >
            {value === 'BUY' ? '매수' : '매도'}
          </button>
        ))}
      </div>

      <Card className="mt-4">
        <dl className="grid grid-cols-2 gap-y-2 text-body-2">
          <dt className="text-fg-neutral-subtle">현재가</dt>
          <dd className="text-right text-fg-neutral tabular-nums">
            {price === null ? '시세 없음' : formatKrw(price)}
          </dd>
          <dt className="text-fg-neutral-subtle">예수금</dt>
          <dd className="text-right text-fg-neutral tabular-nums">
            {formatKrw(info.availableCash)}
          </dd>
          <dt className="text-fg-neutral-subtle">
            {side === 'BUY' ? '최대 매수' : '보유 수량'}
          </dt>
          <dd className="text-right text-fg-neutral tabular-nums">
            {info.maxQuantity}주
          </dd>
        </dl>
      </Card>

      <label className="mt-4 block">
        <span className="text-body-2 text-fg-neutral-subtle">수량</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={quantity === 0 ? '' : quantity}
          onChange={(event) => setQuantity(Number(event.target.value) || 0)}
          placeholder="0"
          className="mt-1 w-full rounded-card border border-stroke-neutral-weak bg-bg-layer-default px-4 py-3 text-right text-title-3 text-fg-neutral tabular-nums"
        />
      </label>

      {/* 분모는 서버가 준 maxQuantity 다. 화면이 계산하지 않는다 (apiSpec §7.3). */}
      <div className="mt-2 flex gap-2">
        {RATIOS.map((ratio) => (
          <button
            key={ratio}
            type="button"
            disabled={info.maxQuantity === 0}
            onClick={() =>
              setQuantity(Math.floor((info.maxQuantity * ratio) / 100))
            }
            className="flex-1 rounded-card border border-stroke-neutral-weak py-2 text-body-2 text-fg-neutral-subtle disabled:text-fg-disabled"
          >
            {ratio === 100 ? '최대' : `${ratio}%`}
          </button>
        ))}
      </div>

      <p className="mt-4 flex justify-between text-body-1">
        <span className="text-fg-neutral-subtle">예상 금액</span>
        <span className="text-fg-neutral tabular-nums">
          {price === null ? '—' : formatKrw(price * quantity)}
        </span>
      </p>

      {!info.tradable ? (
        <Card className="mt-4">
          <p className="text-body-2 text-fg-neutral-subtle">
            지금은 주문할 수 없습니다
          </p>
          {/* 코드를 그대로 보여준다. 문구 매핑은 서버 메시지가 오는 실패 응답에서만 한다. */}
          <p className="mt-1 text-body-2 text-fg-neutral-subtle">
            {info.reason}
          </p>
        </Card>
      ) : null}

      {overMax ? (
        <p className="mt-2 text-body-2 text-fg-down">
          최대 {info.maxQuantity}주까지 주문할 수 있습니다
        </p>
      ) : null}

      {order.isError ? (
        <Card className="mt-4">
          <p className="text-body-2 text-fg-neutral-subtle">
            주문이 처리되지 않았습니다. 다시 시도해 주세요
          </p>
        </Card>
      ) : null}

      {order.isSuccess ? (
        <Card className="mt-4">
          <p className="text-body-1 text-fg-neutral">
            {order.data.side === 'BUY' ? '매수' : '매도'} 체결됐습니다
          </p>
          <p className="mt-1 text-body-2 text-fg-neutral-subtle tabular-nums">
            {order.data.quantity}주 · {formatKrw(order.data.executedPrice)} · 총{' '}
            {formatKrw(order.data.executedAmount)}
          </p>
          <Button
            onClick={() => void navigate(ROUTES.stockDetail(stockCode))}
            className="mt-3"
          >
            종목으로 돌아가기
          </Button>
        </Card>
      ) : (
        <Button onClick={submit} disabled={!canSubmit} className="mt-6 w-full">
          {order.isPending
            ? '주문 중…'
            : `${side === 'BUY' ? '매수' : '매도'}하기`}
        </Button>
      )}
    </PageMain>
  );
}

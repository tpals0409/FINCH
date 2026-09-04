import { useState } from 'react';

import { useAccountSummary } from '@/features/account';
import {
  AmountStep,
  ConfirmStep,
  DepositDone,
  InProgressDialog,
  PaymentMethodStep,
  useCreateDeposit,
  useDepositLimit,
} from '@/features/deposit';
import { HttpError } from '@/shared/api';
import { createIdempotencyKey } from '@/shared/lib/idempotencyKey';
import type { DepositResponse, PaymentMethod } from '@/shared/types/deposit';
import {
  COMMON_ERROR_CODES,
  DEPOSIT_ERROR_CODES,
} from '@/shared/types/errorCodes';
import type { IdempotencyKey } from '@/shared/types/primitives';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * 모의 충전 (apiSpec §4 · featureSpec §3 · 와이어프레임 아트보드 3~9).
 *
 * **단계를 라우트로 쪼개지 않는다.** 넷으로 나누면 뒤로가기가 결제 흐름 한가운데로 돌아가
 * 이미 보낸 요청을 다시 보내는 화면이 열리고, `ROUTES` 에 없는 경로를 프론트가 혼자
 * 만들게 된다 (ia.md §2).
 *
 * ## 멱등성 키의 수명 — 이 화면의 핵심
 *
 * | 사건 | 키 |
 * |---|---|
 * | 확인 화면 진입 | 새로 만들어 상태에 보관 |
 * | `IDEMPOTENCY_IN_PROGRESS` 재시도 | **같은 키** — 재시도지 새 요청이 아니다 |
 * | 잔여 한도로 다시 충전 | **새 키** — 금액이 바뀌었으니 같은 키면 `IDEMPOTENCY_CONFLICT` |
 * | 완료 후 더 충전 | 새 키 |
 *
 * `mutationFn` 안에서 키를 만들면 재시도마다 새 키가 되어 **재시도가 곧 두 번째 충전**이 된다.
 * 그래서 키는 여기 상태에 있고 `mutate` 인자로 넘어간다.
 */
type Step = 'method' | 'amount' | 'confirm' | 'done';

export function DepositPage() {
  const [step, setStep] = useState<Step>('method');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [amount, setAmount] = useState(0);
  const [idempotencyKey, setIdempotencyKey] = useState<IdempotencyKey | null>(
    null,
  );
  const [done, setDone] = useState<DepositResponse | null>(null);

  const limit = useDepositLimit();
  /**
   * 예수금은 `GET /account` 에서만 온다.
   *
   * `cumulativeLimit − remainingAmount` 로 대신하면 **누적 충전액**이 나온다 — 초기 지급도
   * 매수·매도도 반영되지 않은 다른 숫자다. 실제로 그렇게 짰다가 확인 화면이 예수금 자리에
   * 누적 충전액을 그렸다. 두 값이 비슷한 자릿수라 눈으로는 안 걸린다.
   *
   * 페이지가 두 feature 를 함께 쓰는 것은 의존 방향(`pages → features`)에 맞다.
   * feature 끼리 부르는 것이 금지일 뿐이다.
   */
  const account = useAccountSummary();
  const createDeposit = useCreateDeposit();

  const error = createDeposit.error;
  const httpError = error instanceof HttpError ? error : null;
  const isInProgress =
    httpError?.code === COMMON_ERROR_CODES.IDEMPOTENCY_IN_PROGRESS;
  const limitExceededRemaining =
    httpError?.code === DEPOSIT_ERROR_CODES.LIMIT_EXCEEDED
      ? readRemainingAmount(httpError)
      : null;

  /** 키를 새로 만들어 보낸다. 금액이 바뀌는 모든 경로가 이것을 쓴다. */
  const submitWithNewKey = (nextAmount: number, method: PaymentMethod) => {
    const key = createIdempotencyKey();
    setAmount(nextAmount);
    setIdempotencyKey(key);
    createDeposit.mutate(
      {
        body: { amount: nextAmount, paymentMethod: method },
        idempotencyKey: key,
      },
      { onSuccess: (deposit) => finish(deposit) },
    );
  };

  /** 같은 키로 다시 보낸다. 서버가 최초 결과를 그대로 돌려준다 (apiSpec §1.4). */
  const retryWithSameKey = () => {
    if (idempotencyKey === null || paymentMethod === null) {
      return;
    }
    createDeposit.mutate(
      { body: { amount, paymentMethod }, idempotencyKey },
      { onSuccess: (deposit) => finish(deposit) },
    );
  };

  const finish = (deposit: DepositResponse) => {
    setDone(deposit);
    setStep('done');
  };

  const restart = () => {
    createDeposit.reset();
    setIdempotencyKey(null);
    setDone(null);
    setAmount(0);
    setPaymentMethod(null);
    setStep('method');
  };

  return (
    <PageMain>
      <h1 className="text-title-2 text-fg-neutral">충전</h1>

      {/*
        시트가 열린 동안 본문을 `inert` 로 만든다.

        radix `Dialog` 가 바깥에 `aria-hidden`(스크린리더 차단)과 `pointer-events: none`
        (마우스 차단)을 걸어 주지만 **탭 순서에서는 빼 주지 않는다.** 실측에서 뒤의
        "충전하기" 버튼에 포커스가 닿았다. `inert` 는 그 셋을 한 속성으로 닫는 플랫폼 기능이고
        React 19 가 불리언 prop 으로 받는다.

        중복 충전이 실제로 나지는 않았다 — 뒤 버튼을 눌러도 같은 멱등성 키를 다시 보내므로
        서버가 최초 결과를 재생한다(실측: 10,000원 요청 두 번에 원장 1건). 방어선은 키에
        있고 이건 그 위에 덧대는 층이다. 그래도 닫는 이유는, 모달 뒤에서 눌리는 CTA 는
        중복 충전이 아니더라도 그 자체로 결함이기 때문이다.
      */}
      <div className="mt-4" inert={isInProgress}>
        {step === 'method' ? (
          <PaymentMethodStep
            onSelect={(method) => {
              setPaymentMethod(method);
              setStep('amount');
            }}
          />
        ) : null}

        {step === 'amount' ? (
          limit.isPending ? (
            <Card>
              <Skeleton className="h-3 w-12" />
              <Skeleton className="mt-2 h-6 w-44" />
              <Skeleton className="mt-5 h-10 w-full" />
            </Card>
          ) : limit.isError ? (
            <Card>
              <p className="text-body-2 text-fg-neutral-subtle">
                충전 한도를 불러오지 못했습니다
              </p>
              <Button
                onClick={() => void limit.refetch()}
                disabled={limit.isFetching}
                className="mt-3"
              >
                다시 시도
              </Button>
            </Card>
          ) : (
            <AmountStep
              cumulativeLimit={limit.data.cumulativeLimit}
              remainingAmount={limit.data.remainingAmount}
              onSubmit={(next) => {
                setAmount(next);
                // 확인 화면에 들어설 때 키를 만든다. 여기부터가 "같은 클릭" 의 시작이다.
                setIdempotencyKey(createIdempotencyKey());
                setStep('confirm');
              }}
            />
          )
        ) : null}

        {step === 'confirm' && paymentMethod !== null ? (
          <ConfirmStep
            amount={amount}
            paymentMethod={paymentMethod}
            cashBalance={account.data?.cashBalance ?? 0}
            limitExceededRemaining={limitExceededRemaining}
            // IN_PROGRESS 는 시트가 말하므로 카드에 문구를 겹쳐 띄우지 않는다.
            errorMessage={
              httpError !== null && !isInProgress ? httpError.message : null
            }
            isSubmitting={createDeposit.isPending}
            onSubmit={() => {
              if (idempotencyKey === null) {
                return;
              }
              createDeposit.mutate(
                { body: { amount, paymentMethod }, idempotencyKey },
                { onSuccess: (deposit) => finish(deposit) },
              );
            }}
            onEditAmount={() => {
              createDeposit.reset();
              setStep('amount');
            }}
            onSubmitRemaining={(remaining) =>
              submitWithNewKey(remaining, paymentMethod)
            }
          />
        ) : null}

        {step === 'done' && done !== null ? (
          <DepositDone deposit={done} onDepositAgain={restart} />
        ) : null}
      </div>

      <InProgressDialog
        open={isInProgress}
        isRetrying={createDeposit.isPending}
        onRetry={retryWithSameKey}
      />
    </PageMain>
  );
}

/**
 * `DEPOSIT_LIMIT_EXCEEDED` 의 `detail.remainingAmount` 를 꺼낸다.
 *
 * **화면이 `cumulativeLimit − depositedAmount` 로 다시 계산하지 않는다.** 그 두 값도 같은
 * 이유로 낡아 있다 — 서버가 방금 판정하며 준 값이 유일하게 최신이다.
 */
function readRemainingAmount(error: HttpError): number | null {
  const value = error.detail?.remainingAmount;
  return typeof value === 'number' ? value : null;
}

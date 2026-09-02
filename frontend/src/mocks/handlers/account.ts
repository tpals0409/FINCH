import { http, HttpResponse } from 'msw';

import {
  API_PATHS,
  DEPOSIT_PER_REQUEST_LIMIT,
  DEPOSIT_ROUND_CUMULATIVE_LIMIT,
  INITIAL_CASH_BALANCE,
} from '@/shared/config/apiContract';
import {
  COMMON_ERROR_CODES,
  DEPOSIT_ERROR_CODES,
} from '@/shared/types/errorCodes';

import {
  errorResponse,
  mockPath,
  readJsonBody,
  searchParam,
} from '../lib/http';
import { checkIdempotency } from '../lib/idempotency';
import { requireAuth } from '../lib/session';
import { recordTransaction, resetAccount, store } from '../lib/store';
import { nowKstIso } from '../lib/time';
import { evaluationAmount, totalAsset } from '../lib/valuation';

/**
 * 계좌 · 회차 · 충전 (apiSpec §3 · §4).
 *
 * **상태 유지 범위** — 예수금·누적 충전액·회차·원장이 모두 `lib/store.ts` 의 모듈 변수다.
 * 충전과 계좌 리셋이 그 값을 실제로 바꾸므로 잔고 화면이 갱신되는 것을 볼 수 있고,
 * 새로고침하면 초기값으로 돌아간다.
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | `GET /account?roundId=` 에 없는 회차 번호 | `404 RESOURCE_NOT_FOUND` |
 * | `POST /deposits` 멱등성 헤더 없음·`a` 로 시작하는 키·같은 키 다른 본문 | `lib/idempotency.ts` 표 참고 |
 * | `POST /deposits` `amount <= 0` | `400 DEPOSIT_AMOUNT_INVALID` |
 * | `POST /deposits` `amount > 10,000,000` | `409 DEPOSIT_PER_REQUEST_LIMIT_EXCEEDED` |
 * | `POST /deposits` 회차 누적 1억 초과 | `409 DEPOSIT_LIMIT_EXCEEDED` (`detail.remainingAmount`) |
 * | `POST /deposits` `paymentMethod` 열거값 밖 | `400 INVALID_REQUEST` |
 *
 * 판정 순서는 apiSpec §11.2 를 따른다 — 멱등성 → `paymentMethod` → 금액 → 1회 한도 → 누적 한도.
 */

const PAYMENT_METHODS = ['VIRTUAL_CARD', 'VIRTUAL_TRANSFER'];

export const accountHandlers = [
  http.get(mockPath(API_PATHS.account.summary), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    // 조회는 roundId 를 선택적으로 받는다 (apiSpec §1.6). 없는 회차는 404 다.
    const roundIdParam = searchParam(request, 'roundId');
    if (
      roundIdParam !== null &&
      !store.rounds.some((round) => String(round.roundId) === roundIdParam)
    ) {
      return errorResponse(
        COMMON_ERROR_CODES.RESOURCE_NOT_FOUND,
        '요청한 회차를 찾을 수 없습니다',
        404,
      );
    }

    return HttpResponse.json({
      roundId: store.activeRoundId,
      cashBalance: store.cashBalance,
      evaluationAmount: evaluationAmount(),
      totalAsset: totalAsset(),
      asOf: nowKstIso(),
    });
  }),

  http.post(mockPath(API_PATHS.account.reset), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const finalTotalAsset = totalAsset();
    const { closedRoundId, closedStartedAt, newRoundId, at } =
      resetAccount(finalTotalAsset);

    return HttpResponse.json({
      closedRound: {
        roundId: closedRoundId,
        startedAt: closedStartedAt,
        closedAt: at,
        finalTotalAsset,
      },
      newRound: {
        roundId: newRoundId,
        startedAt: at,
        cashBalance: INITIAL_CASH_BALANCE,
      },
    });
  }),

  http.get(mockPath(API_PATHS.account.rounds), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    return HttpResponse.json({
      items: store.rounds.map((round) => ({
        roundId: round.roundId,
        status: round.status,
        startedAt: round.startedAt,
        closedAt: round.closedAt,
        finalTotalAsset: round.finalTotalAsset,
      })),
    });
  }),

  http.get(mockPath(API_PATHS.deposits.limit), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    return HttpResponse.json({
      perRequestLimit: DEPOSIT_PER_REQUEST_LIMIT,
      roundCumulativeLimit: DEPOSIT_ROUND_CUMULATIVE_LIMIT,
      roundDepositedAmount: store.roundDepositedAmount,
      remainingAmount:
        DEPOSIT_ROUND_CUMULATIVE_LIMIT - store.roundDepositedAmount,
    });
  }),

  http.post(mockPath(API_PATHS.deposits.create), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);

    // 멱등성 판정이 본문 검증보다 앞선다 (apiSpec §1.4).
    const idempotency = checkIdempotency(request, body);
    if (idempotency.blocked) {
      return idempotency.response;
    }

    if (body === null) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
      );
    }

    const { amount, paymentMethod } = body;

    if (
      typeof paymentMethod !== 'string' ||
      !PAYMENT_METHODS.includes(paymentMethod)
    ) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { paymentMethod: 'VIRTUAL_CARD 또는 VIRTUAL_TRANSFER 여야 합니다' },
      );
    }

    if (
      typeof amount !== 'number' ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return errorResponse(
        DEPOSIT_ERROR_CODES.AMOUNT_INVALID,
        '충전 금액을 확인해 주세요',
        400,
      );
    }

    if (amount > DEPOSIT_PER_REQUEST_LIMIT) {
      return errorResponse(
        DEPOSIT_ERROR_CODES.PER_REQUEST_LIMIT_EXCEEDED,
        '한 번에 1,000만 원까지 충전할 수 있어요',
        409,
      );
    }

    const remainingAmount =
      DEPOSIT_ROUND_CUMULATIVE_LIMIT - store.roundDepositedAmount;
    if (amount > remainingAmount) {
      return errorResponse(
        DEPOSIT_ERROR_CODES.LIMIT_EXCEEDED,
        '이번 회차에 충전할 수 있는 금액을 넘었어요',
        409,
        { remainingAmount },
      );
    }

    const depositedAt = nowKstIso();
    store.cashBalance += amount;
    store.roundDepositedAmount += amount;
    recordTransaction({
      type: 'DEPOSIT',
      occurredAt: depositedAt,
      stockCode: null,
      stockName: null,
      price: null,
      quantity: null,
      amount,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: paymentMethod as 'VIRTUAL_CARD' | 'VIRTUAL_TRANSFER',
    });

    const depositId = store.nextDepositId;
    store.nextDepositId += 1;

    return idempotency.commit(201, {
      depositId,
      amount,
      paymentMethod,
      cashBalanceAfter: store.cashBalance,
      depositedAt,
    });
  }),
];

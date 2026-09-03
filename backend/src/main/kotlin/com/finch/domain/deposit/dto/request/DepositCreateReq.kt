package com.finch.domain.deposit.dto.request

import com.finch.domain.deposit.entity.PaymentMethod

/**
 * `POST /api/v1/deposits` 요청 본문 (apiSpec 4.2).
 *
 * **이 객체가 멱등성 해시의 재료다** (backConvention 5.3). 같은 키로 다른 값이 오면
 * `IDEMPOTENCY_CONFLICT` 이므로, 필드를 늘리면 그 순간부터 해시가 달라진다 — 배포 중에
 * 재시도가 걸쳐 있으면 그 요청만 충돌한다. 필드 추가는 계약 변경으로 다룬다.
 *
 * `amount` 를 Bean Validation 으로 막지 않는다. `@Positive` 는 `INVALID_REQUEST` 를 내는데
 * apiSpec 4.2 는 0원 이하에 `DEPOSIT_AMOUNT_INVALID` 를 요구한다. 검증을 서비스에서 한다.
 */
data class DepositCreateReq(
	val amount: Long,
	val paymentMethod: PaymentMethod,
)

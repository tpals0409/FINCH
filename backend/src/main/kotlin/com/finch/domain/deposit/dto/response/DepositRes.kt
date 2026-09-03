package com.finch.domain.deposit.dto.response

import com.finch.domain.deposit.entity.PaymentMethod
import java.time.OffsetDateTime

/**
 * `POST /api/v1/deposits` 응답 본문 (apiSpec 4.2). `201 Created`.
 *
 * **이 객체는 멱등성 레코드에 JSONB 로 저장되고 재생 시 그대로 되살아난다.** 그래서 Jackson 이
 * 역직렬화할 수 있어야 한다 — 기본값 없는 `data class` 는 `jackson-module-kotlin` 이 처리한다.
 *
 * `depositedAt` 은 `ledger_entry.occurred_at` 과 **같은 값**이다. 각자 `Instant.now()` 를 부르면
 * 응답의 시각과 원장의 시각이 미세하게 달라지고, 그 차이가 내역 대조에서 드러난다.
 */
data class DepositRes(
	val depositId: Long,
	val amount: Long,
	val paymentMethod: PaymentMethod,
	val cashBalanceAfter: Long,
	val depositedAt: OffsetDateTime,
)

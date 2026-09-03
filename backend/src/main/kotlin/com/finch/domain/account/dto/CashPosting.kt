package com.finch.domain.account.dto

import java.time.Instant

/**
 * 예수금 이동 1건의 결과. `AccountService.post` 가 돌려주고 `deposit`·`order` 가 받는다.
 *
 * 다른 도메인에 `Account`·`LedgerEntry` 엔티티를 넘기지 않기 위한 DTO 다
 * (backConvention 2.4 규칙 3). 엔티티를 넘기면 받은 쪽이 `applyCashDelta` 를 부를 수 있다.
 *
 * `occurredAt` 을 함께 돌려주는 이유 — `POST /deposits` 의 `depositedAt`(apiSpec 4.2)과
 * `ledger_entry.occurred_at` 이 **같은 값이어야** 한다. 각자 `Instant.now()` 를 부르면
 * 응답의 시각과 원장의 시각이 미세하게 달라지고, 그 차이가 내역 대조에서 드러난다.
 */
data class CashPosting(
	val ledgerEntryId: Long,
	val cashBalanceAfter: Long,
	val occurredAt: Instant,
)

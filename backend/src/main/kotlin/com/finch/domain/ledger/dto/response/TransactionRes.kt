package com.finch.domain.ledger.dto.response

import java.time.OffsetDateTime

/**
 * `GET /transactions` 목록의 한 행 (apiSpec 8.2). 충전 건과 체결 건이 **같은 스키마를 공유하고**
 * 해당 없는 필드가 `null` 이 된다.
 *
 * 두 모양으로 나누지 않은 이유 — 한 목록에 섞여 내려가므로 클라이언트가 `type` 으로 분기해야 하고,
 * 그 분기는 필드 유무가 아니라 `type` 값으로 하는 것이 계약상 명확하다. 프론트의 행 컴포넌트가
 * 두 종류로 갈리는 것과는 별개다.
 *
 * ⚠️ **체결 관련 필드 다섯은 지금 항상 `null` 이다** (`stockCode`·`stockName`·`price`·`quantity`·
 * `realizedProfit`·`realizedProfitRate`). 주문이 없어 `trade` 가 0행이기 때문이고, 조회 쿼리도
 * 아직 `trade` 를 조인하지 않는다 — 이유는 `LedgerEntryRepository.findPage` 주석에 있다.
 */
data class TransactionRes(
	val transactionId: Long,
	val type: String,
	val occurredAt: OffsetDateTime,
	val stockCode: String?,
	val stockName: String?,
	val price: Long?,
	val quantity: Long?,
	val amount: Long,
	val realizedProfit: Long?,
	val realizedProfitRate: Double?,
	val paymentMethod: String?,
)

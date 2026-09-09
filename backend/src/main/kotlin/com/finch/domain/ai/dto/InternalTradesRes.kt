package com.finch.domain.ai.dto

import java.time.OffsetDateTime

data class InternalTradesRes(
	val trades: List<Trade>,
	val nextCursor: String?,
	val hasNext: Boolean,
) {
	data class Trade(
		val tradeId: Long,
		val stockCode: String,
		val side: String,
		val price: Long,
		val quantity: Long,
		val executedAt: OffsetDateTime,
		val fee: Long = 0,
	)
}

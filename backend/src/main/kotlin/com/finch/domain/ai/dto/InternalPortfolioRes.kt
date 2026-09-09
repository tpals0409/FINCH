package com.finch.domain.ai.dto

import java.time.OffsetDateTime

data class InternalPortfolioRes(
	val cashBalance: Long,
	val asOf: OffsetDateTime?,
	val holdings: List<Holding>,
) {
	data class Holding(
		val stockCode: String,
		val stockName: String,
		val quantity: Long,
		val avgBuyPrice: Long,
		val currentPrice: Long?,
		val previousClose: Long?,
	)
}

package com.finch.domain.portfolio.dto

import java.math.BigDecimal
import java.time.OffsetDateTime

data class PortfolioSnapshot(
	val evaluationAmount: Long?,
	val asOf: OffsetDateTime?,
	val holdings: List<HoldingValuation>,
)

data class HoldingValuation(
	val stockCode: String,
	val stockName: String,
	val quantity: Long,
	val avgBuyPrice: Long,
	val currentPrice: Long?,
	val previousClose: Long?,
	val evaluationAmount: Long?,
	val evaluationProfit: Long?,
	val evaluationProfitRate: BigDecimal?,
)

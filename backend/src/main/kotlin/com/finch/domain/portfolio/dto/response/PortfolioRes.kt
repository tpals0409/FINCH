package com.finch.domain.portfolio.dto.response

import com.finch.domain.portfolio.dto.HoldingValuation
import java.math.BigDecimal
import java.time.OffsetDateTime

data class PortfolioRes(
	val cashBalance: Long,
	val evaluationAmount: Long?,
	val totalAsset: Long?,
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
		val evaluationAmount: Long?,
		val evaluationProfit: Long?,
		val evaluationProfitRate: BigDecimal?,
	)

	companion object {
		fun HoldingValuation.toResponse() = Holding(
			stockCode = stockCode,
			stockName = stockName,
			quantity = quantity,
			avgBuyPrice = avgBuyPrice,
			currentPrice = currentPrice,
			previousClose = previousClose,
			evaluationAmount = evaluationAmount,
			evaluationProfit = evaluationProfit,
			evaluationProfitRate = evaluationProfitRate,
		)
	}
}

package com.finch.domain.portfolio.service

import com.finch.domain.account.dto.AccountValuation
import com.finch.domain.account.service.AccountValuationReader
import com.finch.domain.portfolio.dto.HoldingValuation
import com.finch.domain.portfolio.dto.PortfolioSnapshot
import com.finch.domain.portfolio.repository.HoldingPositionRow
import com.finch.domain.portfolio.repository.HoldingRepository
import com.finch.domain.price.service.PriceService
import com.finch.global.util.toKst
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** 보유 평가 계산의 단일 진입점. 계좌·포트폴리오·종목 상세가 모두 이 계산을 쓴다. */
@Service
class PortfolioValuationService(
	private val holdingRepository: HoldingRepository,
	private val priceService: PriceService,
) : AccountValuationReader {

	@Transactional(readOnly = true)
	fun getSnapshot(accountId: Long): PortfolioSnapshot {
		val rows = holdingRepository.findPositionsByAccountId(accountId)
		if (rows.isEmpty()) return PortfolioSnapshot(0, Instant.now().toKst(), emptyList())

		val prices = priceService.getAll(
			rows.map { it.stockCode },
			rows.associate { it.stockCode to it.previousClose },
		)
		val holdings = rows.map { value(it, prices.getValue(it.stockCode).currentPrice) }
		val complete = holdings.all { it.evaluationAmount != null }
		return PortfolioSnapshot(
			evaluationAmount = if (complete) holdings.sumOf { it.evaluationAmount!! } else null,
			asOf = if (complete) prices.values.minOf { it.asOf!! } else null,
			holdings = holdings,
		)
	}

	@Transactional(readOnly = true)
	fun getHolding(accountId: Long, stockCode: String, currentPrice: Long?): HoldingValuation? =
		holdingRepository.findPositionByAccountIdAndStockCode(accountId, stockCode)
			?.let { value(it, currentPrice) }

	@Transactional(readOnly = true)
	override fun getValuation(accountId: Long): AccountValuation =
		getSnapshot(accountId).let { AccountValuation(it.evaluationAmount, it.asOf) }

	private fun value(row: HoldingPositionRow, currentPrice: Long?): HoldingValuation =
		value(row.stockCode, row.stockName, row.quantity, row.avgBuyPrice, currentPrice, row.previousClose)

	private fun value(
		stockCode: String,
		stockName: String,
		quantity: Long,
		avgBuyPrice: Long,
		currentPrice: Long?,
		previousClose: Long?,
	): HoldingValuation {
		val evaluationAmount = currentPrice?.let { it * quantity }
		val evaluationProfit = currentPrice?.let { (it - avgBuyPrice) * quantity }
		val cost = avgBuyPrice * quantity
		return HoldingValuation(
			stockCode = stockCode,
			stockName = stockName,
			quantity = quantity,
			avgBuyPrice = avgBuyPrice,
			currentPrice = currentPrice,
			previousClose = previousClose,
			evaluationAmount = evaluationAmount,
			evaluationProfit = evaluationProfit,
			evaluationProfitRate = evaluationProfit?.takeIf { cost > 0 }?.let {
				BigDecimal(it).multiply(HUNDRED).divide(BigDecimal(cost), 2, RoundingMode.HALF_UP)
			},
		)
	}

	companion object {
		private val HUNDRED = BigDecimal(100)
	}
}

package com.finch.domain.portfolio.service

import com.finch.domain.account.service.AccountService
import com.finch.domain.stock.dto.response.StockDetailRes
import com.finch.domain.stock.service.StockHoldingReader
import org.springframework.stereotype.Component

/** stock가 소유한 조회 포트를 portfolio 계산으로 연결한다. */
@Component
class PortfolioStockHoldingReader(
	private val accountService: AccountService,
	private val valuationService: PortfolioValuationService,
) : StockHoldingReader {
	override fun getHolding(userId: Long, stockCode: String, currentPrice: Long?): StockDetailRes.Holding? =
		valuationService.getHolding(accountService.getAccountId(userId), stockCode, currentPrice)?.let {
			StockDetailRes.Holding(it.quantity, it.avgBuyPrice, it.evaluationProfit, it.evaluationProfitRate)
		}
}

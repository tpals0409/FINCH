package com.finch.domain.ai.service

import com.finch.domain.ai.dto.InternalPortfolioRes
import com.finch.domain.ai.dto.InternalTradesRes
import com.finch.domain.order.repository.TradeRepository
import com.finch.domain.portfolio.dto.PortfolioSort
import com.finch.domain.portfolio.service.PortfolioService
import com.finch.global.apiPayload.CursorPage
import com.finch.global.util.Cursor
import com.finch.global.util.toKst
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class InternalLedgerService(
	private val portfolioService: PortfolioService,
	private val tradeRepository: TradeRepository,
) {
	@Transactional(readOnly = true)
	fun getPortfolio(userId: Long): InternalPortfolioRes {
		val portfolio = portfolioService.getPortfolio(userId, PortfolioSort.EVALUATION)
		return InternalPortfolioRes(
			cashBalance = portfolio.cashBalance,
			asOf = portfolio.asOf,
			holdings = portfolio.holdings.map {
				InternalPortfolioRes.Holding(it.stockCode, it.stockName, it.quantity, it.avgBuyPrice, it.currentPrice)
			},
		)
	}

	@Transactional(readOnly = true)
	fun getTrades(userId: Long, cursor: String?, size: Int?): InternalTradesRes {
		val limit = CursorPage.resolveSize(size ?: INTERNAL_DEFAULT_SIZE)
		val rows = tradeRepository.findInternalPage(userId, Cursor.decodeToExclusiveUpperBound(cursor), limit + 1)
		val hasNext = rows.size > limit
		val page = if (hasNext) rows.subList(0, limit) else rows
		return InternalTradesRes(
			trades = page.map { row ->
				InternalTradesRes.Trade(row.tradeId, row.stockCode, row.side, row.price, row.quantity, row.executedAt.toKst())
			},
			nextCursor = if (hasNext) Cursor.encode(page.last().tradeId) else null,
			hasNext = hasNext,
		)
	}

	companion object {
		private const val INTERNAL_DEFAULT_SIZE = 100
	}
}

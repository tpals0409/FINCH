package com.finch.domain.order.repository

import com.finch.domain.ai.repository.InternalTradeRow
import com.finch.domain.order.entity.Trade
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.Repository
import org.springframework.data.repository.query.Param

interface TradeRepository : Repository<Trade, Long> {
	fun save(trade: Trade): Trade

	@Query(
		value = """
			SELECT t.id AS \"tradeId\", t.stock_code AS \"stockCode\", t.side AS side,
			       t.executed_price AS price, t.quantity AS quantity, t.executed_at AS \"executedAt\"
			  FROM trade t
			  JOIN account a ON a.id = t.account_id AND a.user_id = :userId
			 WHERE t.id < :cursorId
			 ORDER BY t.id DESC
			 LIMIT :limit
		""",
		nativeQuery = true,
	)
	fun findInternalPage(
		@Param("userId") userId: Long,
		@Param("cursorId") cursorId: Long,
		@Param("limit") limit: Int,
	): List<InternalTradeRow>
}

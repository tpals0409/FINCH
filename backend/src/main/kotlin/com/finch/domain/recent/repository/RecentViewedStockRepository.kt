package com.finch.domain.recent.repository

import com.finch.domain.recent.entity.RecentViewedStock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.Repository
import org.springframework.data.repository.query.Param

interface RecentViewedStockRepository : Repository<RecentViewedStock, Long> {

	@Modifying
	@Query(
		value = """
			INSERT INTO recent_viewed_stock (user_id, stock_code, viewed_at)
			VALUES (:userId, :stockCode, CURRENT_TIMESTAMP)
			ON CONFLICT (user_id, stock_code)
			DO UPDATE SET viewed_at = EXCLUDED.viewed_at
		""",
		nativeQuery = true,
	)
	fun upsert(@Param("userId") userId: Long, @Param("stockCode") stockCode: String): Int

	fun findByUserIdOrderByViewedAtDescIdDesc(userId: Long): List<RecentViewedStock>

	fun deleteByUserIdAndStockCode(userId: Long, stockCode: String): Long

	fun deleteByUserId(userId: Long): Long

	fun deleteById(id: Long)
}

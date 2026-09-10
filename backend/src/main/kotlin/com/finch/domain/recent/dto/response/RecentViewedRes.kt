package com.finch.domain.recent.dto.response

import com.finch.domain.stock.dto.response.StockSearchRes
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId

data class RecentViewedRes(
	val items: List<Item>,
) {
	data class Item(
		val stockCode: String,
		val stockName: String,
		val currentPrice: Long?,
		val changeRate: java.math.BigDecimal?,
		val viewedAt: OffsetDateTime,
	)

	companion object {
		private val KST = ZoneId.of("Asia/Seoul")

		fun item(summary: StockSearchRes.Item, viewedAt: Instant): Item = Item(
			stockCode = summary.stockCode,
			stockName = summary.stockName,
			currentPrice = summary.currentPrice,
			changeRate = summary.changeRate,
			viewedAt = viewedAt.atZone(KST).toOffsetDateTime(),
		)
	}
}

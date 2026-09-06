package com.finch.domain.watchlist.dto.response

import com.finch.domain.stock.dto.response.StockSearchRes
import java.math.BigDecimal
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId

/**
 * `GET /api/v1/watchlist` 응답 (apiSpec 6.3).
 *
 * `maxCount` 를 응답에 싣는 이유는 화면이 "12/50" 을 그리기 때문이다. 프론트가 50 을 상수로
 * 들고 있으면 한도를 바꿀 때 두 곳을 고쳐야 하고, 한쪽만 고치면 화면이 거짓을 그린다.
 */
data class WatchlistRes(
	val count: Int,
	val maxCount: Int,
	val items: List<Item>,
) {
	/**
	 * 한 줄.
	 *
	 * ⚠️ **`held` 는 지금 항상 `false` 다.** 보유가 없어서가 아니라 `holding` 도메인이 없어서다.
	 * 다만 주문이 없어 실제로 보유가 생길 수도 없으므로 지금은 두 이유가 같은 답을 낸다.
	 * 주문이 붙는 순간 이 값을 채우지 않으면 담아 둔 보유 종목에 "보유" 뱃지가 안 뜬다.
	 */
	data class Item(
		val stockCode: String,
		val stockName: String,
		val currentPrice: Long?,
		val changeAmount: Long?,
		val changeRate: BigDecimal?,
		val held: Boolean,
		val registeredAt: OffsetDateTime,
	)

	companion object {
		/** 거래일 경계와 응답 시각은 KST 다 (apiSpec 1.1). */
		private val KST = ZoneId.of("Asia/Seoul")

		fun item(summary: StockSearchRes.Item, registeredAt: Instant): Item =
			Item(
				stockCode = summary.stockCode,
				stockName = summary.stockName,
				currentPrice = summary.currentPrice,
				changeAmount = summary.changeAmount,
				changeRate = summary.changeRate,
				held = false,
				registeredAt = registeredAt.atZone(KST).toOffsetDateTime(),
			)
	}
}

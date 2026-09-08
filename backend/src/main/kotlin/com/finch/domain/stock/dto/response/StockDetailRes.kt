package com.finch.domain.stock.dto.response

import com.finch.domain.price.dto.response.PriceRes
import com.finch.domain.stock.entity.Market
import com.finch.domain.stock.entity.Stock
import java.math.BigDecimal
import java.time.OffsetDateTime

/**
 * `GET /api/v1/stocks/{stockCode}` 응답 (apiSpec 5.2).
 *
 * **상장폐지 종목도 내려간다.** 검색에서만 빼고 상세는 막지 않는다 — 보유 종목이 폐지됐을 때
 * 조회가 404 가 되면 화면이 그 종목을 그릴 방법이 없다 (`StockService.getOrThrow` 주석).
 *
 * `holding`은 portfolio 도메인이 제공한다. 보유가 없거나 전량 매도한 종목이면 `null`이다.
 */
data class StockDetailRes(
	val stockCode: String,
	val stockName: String,
	val market: Market,
	val currentPrice: Long?,
	val previousClose: Long?,
	val changeAmount: Long?,
	val changeRate: BigDecimal?,
	val suspended: Boolean,
	val suspendedReason: String?,
	val watched: Boolean,
	val asOf: OffsetDateTime?,
	val holding: Holding?,
) {
	/**
	 * 보유 정보. 보유하지 않으면 통째로 `null` 이다.
	 *
	 * **전량 매도로 `quantity = 0` 인 행이 남아 있어도 `null` 이다** — 잔존 행은 재매수 시
	 * INSERT 경합을 막는 내부 구현이고 API 로 노출하지 않는다 (apiSpec 5.2, 이슈 #19).
	 */
	data class Holding(
		val quantity: Long,
		val avgBuyPrice: Long,
		val evaluationProfit: Long?,
		val evaluationProfitRate: BigDecimal?,
	)

	companion object {
		fun of(stock: Stock, price: PriceRes, watched: Boolean, holding: Holding?): StockDetailRes =
			StockDetailRes(
				stockCode = stock.stockCode,
				stockName = stock.stockName,
				market = stock.market,
				currentPrice = price.currentPrice,
				previousClose = stock.previousClose,
				changeAmount = price.changeAmount,
				changeRate = price.changeRate,
				suspended = stock.suspended,
				suspendedReason = stock.suspendedReason,
				watched = watched,
				asOf = price.asOf,
				holding = holding,
			)
	}
}

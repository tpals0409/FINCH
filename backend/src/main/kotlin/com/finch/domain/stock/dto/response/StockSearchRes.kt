package com.finch.domain.stock.dto.response

import com.finch.domain.price.dto.response.PriceRes
import com.finch.domain.stock.entity.Market
import com.finch.domain.stock.entity.Stock
import java.math.BigDecimal

/**
 * `GET /api/v1/stocks/search` 응답 (apiSpec 5.1).
 *
 * **상장폐지 종목은 여기 없다.** 응답에 구분 필드를 두지 않고 조회에서 뺀다 — 화면이
 * "이건 폐지된 종목" 을 그릴 일이 없기 때문이다 (이슈 #19).
 */
data class StockSearchRes(
	val items: List<Item>,
) {
	data class Item(
		val stockCode: String,
		val stockName: String,
		val market: Market,
		val currentPrice: Long?,
		val changeAmount: Long?,
		val changeRate: BigDecimal?,
		val suspended: Boolean,
	)

	companion object {
		fun of(stocks: List<Stock>, prices: Map<String, PriceRes>): StockSearchRes =
			StockSearchRes(
				stocks.map { stock ->
					val price = prices[stock.stockCode]
					Item(
						stockCode = stock.stockCode,
						stockName = stock.stockName,
						market = stock.market,
						currentPrice = price?.currentPrice,
						changeAmount = price?.changeAmount,
						changeRate = price?.changeRate,
						suspended = stock.suspended,
					)
				},
			)
	}
}

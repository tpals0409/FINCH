package com.finch.domain.stock.dto.response

import com.finch.domain.stock.entity.CandlePeriod
import com.finch.domain.stock.entity.DailyCandle
import java.time.LocalDate

/**
 * `GET /api/v1/stocks/{stockCode}/candles` 응답 (apiSpec 5.3).
 *
 * `interval` 이 항상 `DAY` 인데도 필드로 두는 이유는 분봉이 확장 범위여서다(`[S0-4]`).
 * 나중에 값이 늘어도 응답 모양이 안 바뀐다.
 *
 * ⚠️ **지금은 항상 빈 배열이다.** `daily_candle` 이 비어 있고, 채우려면 KRX API 키가 필요한데
 * 아직 미발급이다. 빈 배열은 계약 위반이 아니다 — 신규 상장 종목도 같은 응답을 낸다.
 */
data class CandlesRes(
	val stockCode: String,
	val period: CandlePeriod,
	val interval: String = "DAY",
	val candles: List<Candle>,
) {
	data class Candle(
		val date: LocalDate,
		val open: Long,
		val high: Long,
		val low: Long,
		val close: Long,
		val volume: Long,
	)

	companion object {
		fun of(stockCode: String, period: CandlePeriod, candles: List<DailyCandle>): CandlesRes =
			CandlesRes(
				stockCode = stockCode,
				period = period,
				candles = candles.map {
					Candle(it.id.tradeDate, it.open, it.high, it.low, it.close, it.volume)
				},
			)
	}
}

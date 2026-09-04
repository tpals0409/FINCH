package com.finch.domain.price.dto.response

import com.finch.domain.price.service.PriceTick
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.OffsetDateTime

/**
 * 시세 응답 조각 (apiSpec 5.4). 단건·다건 조회가 같은 모양을 쓰고, 종목 검색·상세도 이 값을 품는다.
 *
 * **`stale` 규칙은 세 갈래다** (apiSpec 5.4 표).
 *
 * | 상황 | 값 | `asOf` | `stale` |
 * |---|---|---|---|
 * | 정상 수신 | 최신 | 최신 수신 시각 | `false` |
 * | 수신 끊김 | **마지막 값 유지** | 마지막 수신 시각 | `true` |
 * | 값 없음 | 전부 `null` | `null` | `true` |
 *
 * 가운데 줄이 핵심이다. 끊겼다고 값을 비우면 화면에서 가격이 사라졌다 나타났다 한다.
 * 마지막 값을 그대로 두고 `stale` 로만 알리면 프론트가 "시세 지연" 배지만 덧붙이면 된다.
 */
data class PriceRes(
	val stockCode: String,
	val currentPrice: Long?,
	val changeAmount: Long?,
	val changeRate: BigDecimal?,
	val asOf: OffsetDateTime?,
	val stale: Boolean,
) {
	companion object {

		/** 수신 이력이 없을 때. 전부 `null` 이고 `stale` 이다. */
		fun empty(stockCode: String): PriceRes =
			PriceRes(stockCode, null, null, null, null, stale = true)

		/**
		 * 수신값에 전일 종가를 붙여 등락을 유도한다.
		 *
		 * `previousClose` 가 없거나 0 이면 등락만 `null` 이고 현재가는 그대로 내려간다 —
		 * 신규 상장처럼 기준이 없는 종목에서 가격까지 감추면 화면이 통째로 빈다.
		 */
		fun of(stockCode: String, tick: PriceTick, previousClose: Long?, stale: Boolean): PriceRes {
			val base = previousClose?.takeIf { it > 0 }
			val diff = base?.let { tick.currentPrice - it }
			return PriceRes(
				stockCode = stockCode,
				currentPrice = tick.currentPrice,
				changeAmount = diff,
				// 소수 둘째 자리까지. Double 로 하면 -1.2100000000000002 같은 값이 JSON 에 그대로 나간다.
				changeRate = diff?.let {
					BigDecimal(it).multiply(HUNDRED).divide(BigDecimal(base), 2, RoundingMode.HALF_UP)
				},
				asOf = tick.asOf,
				stale = stale,
			)
		}

		private val HUNDRED = BigDecimal(100)
	}
}

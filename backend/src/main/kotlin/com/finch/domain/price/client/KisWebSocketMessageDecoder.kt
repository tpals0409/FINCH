package com.finch.domain.price.client

import com.finch.domain.price.service.PriceTick
import java.time.OffsetDateTime
import java.util.regex.Pattern

internal data class KisPriceMessage(
	val stockCode: String,
	val tick: PriceTick,
)

internal data class KisSubscriptionAck(
	val stockCode: String,
	val success: Boolean,
)

/** KIS H0STCNT0의 외부 프레임을 내부 시세 타입으로만 변환한다. */
internal class KisWebSocketMessageDecoder(
	private val now: () -> OffsetDateTime,
) {

	fun decodePrices(raw: String): List<KisPriceMessage> {
		val envelope = raw.split('|', limit = 4)
		if (envelope.size != 4 || envelope[0] != REALTIME_TYPE || envelope[1] != PRICE_TR_ID) return emptyList()
		val count = envelope[2].toIntOrNull()?.takeIf { it > 0 } ?: return emptyList()

		val fields = envelope[3].split('^')
		if (fields.size % count != 0) return emptyList()
		val fieldsPerRecord = fields.size / count
		return (0 until count).mapNotNull { record ->
			val offset = record * fieldsPerRecord
			val stockCode = fields.getOrNull(offset + STOCK_CODE_INDEX)?.takeIf(STOCK_CODE::matches) ?: return@mapNotNull null
			val currentPrice = fields.getOrNull(offset + CURRENT_PRICE_INDEX)?.toLongOrNull()?.takeIf { it > 0 }
				?: return@mapNotNull null
			KisPriceMessage(stockCode, PriceTick(currentPrice, now()))
		}
	}

	fun decodePrice(raw: String): KisPriceMessage? = decodePrices(raw).firstOrNull()

	fun decodeSubscriptionAck(raw: String): KisSubscriptionAck? {
		if (!raw.trimStart().startsWith('{')) return null
		val stockCode = find(TR_KEY_PATTERN, raw)?.takeIf(STOCK_CODE::matches) ?: return null
		val resultCode = find(RESULT_CODE_PATTERN, raw) ?: return null
		return KisSubscriptionAck(stockCode, resultCode == "0")
	}

	private fun find(pattern: Pattern, raw: String): String? = pattern.matcher(raw).let { matcher ->
		if (matcher.find()) matcher.group(1) else null
	}

	companion object {
		private const val REALTIME_TYPE = "0"
		private const val PRICE_TR_ID = "H0STCNT0"
		private const val STOCK_CODE_INDEX = 0
		private const val CURRENT_PRICE_INDEX = 2
		private val STOCK_CODE = Regex("^[0-9]{6}$")
		private val TR_KEY_PATTERN = Pattern.compile("\\\"tr_key\\\"\\s*:\\s*\\\"([0-9]{6})\\\"")
		private val RESULT_CODE_PATTERN = Pattern.compile("\\\"rt_cd\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"")
	}
}

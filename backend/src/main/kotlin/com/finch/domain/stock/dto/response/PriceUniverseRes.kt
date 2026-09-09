package com.finch.domain.stock.dto.response

import java.time.OffsetDateTime

data class PriceUniverseRes(
	val items: List<Item>,
	val nextCursor: String?,
	val hasNext: Boolean,
	val asOf: OffsetDateTime,
) {
	data class Item(val stockCode: String)
}

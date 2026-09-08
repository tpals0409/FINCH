package com.finch.domain.price.dto.response

/** `GET /api/v1/stocks/prices` 응답. 항목은 단건 현재가와 같은 계약을 쓴다 (apiSpec 5.5). */
data class PricesRes(
	val items: List<PriceRes>,
)

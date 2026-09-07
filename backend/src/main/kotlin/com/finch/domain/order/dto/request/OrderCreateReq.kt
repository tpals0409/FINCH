package com.finch.domain.order.dto.request

import com.finch.domain.order.entity.OrderSide

/** `POST /api/v1/orders` 요청 (apiSpec 7.1). 시장가라 가격을 받지 않는다. */
data class OrderCreateReq(
	val stockCode: String,
	val side: OrderSide,
	val quantity: Long,
)

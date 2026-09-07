package com.finch.domain.order.dto.response

/**
 * `GET /api/v1/orders/available` 응답 (apiSpec 7.3). 주문 화면이 최대 수량을 그리는 데 쓴다.
 *
 * **여기 값으로 체결을 보장하지 않는다.** 조회와 체결 사이에 가격이 움직이거나 다른 주문이
 * 끼어들 수 있어, 체결 직전에 서버가 다시 판정한다 (apiSpec 7.2 의 4번).
 */
data class OrderAvailableRes(
	val stockCode: String,
	val currentPrice: Long?,
	val cashBalance: Long,
	/** `예수금 / 현재가`. 시세가 없으면 `0` 이다 — 살 수 있는 수량을 셀 근거가 없다. */
	val maxBuyQuantity: Long,
	/** 보유 수량 그대로. 시세와 무관하다. */
	val maxSellQuantity: Long,
)

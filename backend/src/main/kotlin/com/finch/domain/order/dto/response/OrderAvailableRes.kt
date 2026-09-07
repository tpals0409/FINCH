package com.finch.domain.order.dto.response

/**
 * `GET /api/v1/orders/available` 응답 (apiSpec 7.3). 주문 화면의 비율 버튼(10%/25%/50%/최대)과
 * 주문 버튼 활성 여부에 쓴다.
 *
 * **분모를 서버가 낸다.** 화면이 `예수금 / 현재가` 를 직접 계산하면 반올림과 수수료 가정이
 * 두 곳에 생기고, 그 둘이 어긋나면 화면이 "살 수 있다" 고 말한 주문이 체결에서 거절된다.
 *
 * **여기 값으로 체결을 보장하지 않는다.** 조회와 체결 사이에 가격이 움직이거나 다른 주문이
 * 끼어들 수 있어 체결 직전에 다시 판정한다 (apiSpec 7.2 의 4번).
 */
data class OrderAvailableRes(
	val tradable: Boolean,
	/** `tradable` 이 `false` 일 때만 값이 있다. `OrderErrorCode` 의 이름 그대로다. */
	val reason: String?,
	/**
	 * 시세 캐시에 수신 이력이 없으면 `null` 이다 (apiSpec 5.4 "값 없음"과 같은 규칙).
	 * 그때는 `tradable` 이 `false` 이고 `reason` 이 `ORDER_PRICE_UNAVAILABLE` 이다.
	 */
	val currentPrice: Long?,
	val availableCash: Long,
	/** 매수면 `예수금 / 현재가`, 매도면 보유 수량. 주문할 수 없는 상태면 `0` 이다. */
	val maxQuantity: Long,
	val holdingQuantity: Long,
)

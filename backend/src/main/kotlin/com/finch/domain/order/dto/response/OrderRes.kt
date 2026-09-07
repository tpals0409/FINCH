package com.finch.domain.order.dto.response

import com.finch.domain.order.entity.OrderSide
import java.time.OffsetDateTime

/**
 * `POST /api/v1/orders` 응답 (apiSpec 7.1).
 *
 * `cashBalanceAfter` 를 싣는 이유는 화면이 체결 직후 잔고를 다시 조회하지 않아도 되게 하기
 * 위해서다. 조회로 다시 읽으면 그 사이에 다른 요청이 끼어들어 방금 체결과 무관한 값이 보인다.
 */
data class OrderRes(
	val orderId: Long,
	val stockCode: String,
	val stockName: String,
	val side: OrderSide,
	val quantity: Long,
	val executedPrice: Long,
	val executedAmount: Long,
	val executedAt: OffsetDateTime,
	val cashBalanceAfter: Long,
	/** 매도일 때만 값이 있다 (apiSpec 7.1). */
	val realizedProfit: Long?,
)

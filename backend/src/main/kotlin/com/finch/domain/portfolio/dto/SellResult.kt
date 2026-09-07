package com.finch.domain.portfolio.dto

/**
 * 매도 반영 결과.
 *
 * **수량 부족을 예외로 던지지 않고 `null` 로 돌려준다.** 그 상황의 에러 코드는
 * `ORDER_INSUFFICIENT_QUANTITY`(apiSpec 7.2)인데, portfolio 가 order 의 에러 코드를
 * import 하면 층이 뒤집힌다 (backConvention 2.4). 부르는 쪽이 자기 코드로 바꾼다.
 */
data class SellResult(
	/** `(체결가 − 평단) × 수량`. 손실이면 음수다. */
	val realizedProfit: Long,
	/**
	 * 체결 **직전** 평단. `trade.avg_buy_price` 에 스냅샷으로 남는다 —
	 * 평단은 전량 매도로 0 이 되므로 이 값이 없으면 과거 수익률을 재현할 수 없다 (V1 주석).
	 */
	val avgBuyPriceBefore: Long,
)

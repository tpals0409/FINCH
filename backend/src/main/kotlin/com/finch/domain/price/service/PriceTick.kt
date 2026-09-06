package com.finch.domain.price.service

import java.time.OffsetDateTime

/**
 * 시세 캐시에 담기는 한 종목의 마지막 수신값. KIS 가 준 것만 담는다.
 *
 * 등락(`changeAmount`·`changeRate`)을 여기 넣지 않는 이유는 그것이 수신값이 아니라 유도값이어서다.
 * 전일 종가는 `stock.previous_close` 에 있고, 스키마가 그 컬럼을 "의도적 중복"(erd.md 2.7)이라고
 * 적어둔 근거가 이 계산이다. 캐시에도 복사하면 전일 종가가 배치로 갱신될 때 두 곳이 어긋난다.
 */
data class PriceTick(
	val currentPrice: Long,
	val asOf: OffsetDateTime,
)

package com.finch.domain.price.service

import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import tools.jackson.databind.ObjectMapper

/** KIS 수신값을 PriceService가 이미 읽는 Redis 형식으로 적재한다. */
@Service
internal class PriceCacheWriter(
	private val redisTemplate: StringRedisTemplate,
	private val objectMapper: ObjectMapper,
) {

	fun write(stockCode: String, tick: PriceTick) {
		require(STOCK_CODE.matches(stockCode)) { "종목코드는 6자리 문자열이어야 합니다" }
		// 마지막 수신값은 stale 상태에서도 유지해야 하므로 틱 키에는 TTL을 두지 않는다.
		redisTemplate.opsForValue().set(KEY_PREFIX + stockCode, objectMapper.writeValueAsString(tick))
	}

	companion object {
		private const val KEY_PREFIX = "price:"
		private val STOCK_CODE = Regex("^[0-9]{6}$")
	}
}

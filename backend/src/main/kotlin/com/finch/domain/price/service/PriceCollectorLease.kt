package com.finch.domain.price.service

import java.time.Duration
import java.util.UUID
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.script.DefaultRedisScript
import org.springframework.stereotype.Component

/** backend 복제본 중 하나만 KIS 호출량을 소비하도록 Redis 임대를 잡는다. */
@Component
@ConditionalOnProperty(prefix = "finch.price.kis", name = ["enabled"], havingValue = "true")
internal class PriceCollectorLease(
	private val redisTemplate: StringRedisTemplate,
) {

	private val owner = UUID.randomUUID().toString()

	fun acquireOrRenew(): Boolean {
		if (redisTemplate.opsForValue().setIfAbsent(KEY, owner, TTL) == true) return true
		return redisTemplate.execute(RENEW_SCRIPT, listOf(KEY), owner, TTL.toMillis().toString()) == 1L
	}

	companion object {
		private const val KEY = "price:collector:lease"
		private val TTL = Duration.ofSeconds(30)
		private val RENEW_SCRIPT = DefaultRedisScript(
			"if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end",
			Long::class.java,
		)
	}
}

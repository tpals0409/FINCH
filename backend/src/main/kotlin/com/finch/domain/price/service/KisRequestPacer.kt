package com.finch.domain.price.service

import java.time.Duration
import java.util.concurrent.TimeUnit
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component

/** KIS 자격증명 등급에 맞춰 주입된 간격 이상으로 REST 호출 시작 시각을 벌린다. */
@Component
@ConditionalOnProperty(prefix = "finch.price.kis", name = ["enabled"], havingValue = "true")
internal class KisRequestPacer internal constructor(
	private val minInterval: Duration,
	private val nanoTime: () -> Long,
	private val sleepNanos: (Long) -> Unit,
) {

	@Autowired
	constructor(
		@Value("\${KIS_MIN_REQUEST_INTERVAL}") minInterval: Duration,
	) : this(minInterval, System::nanoTime, { TimeUnit.NANOSECONDS.sleep(it) })

	private var lastRequestAt: Long? = null

	@Synchronized
	fun awaitPermit(): Boolean {
		val now = nanoTime()
		val remaining = lastRequestAt?.let { minInterval.toNanos() - (now - it) } ?: 0
		if (remaining > 0) {
			try {
				sleepNanos(remaining)
			} catch (_: InterruptedException) {
				Thread.currentThread().interrupt()
				return false
			}
		}
		lastRequestAt = nanoTime()
		return true
	}

	init {
		require(minInterval.isPositive) { "KIS_MIN_REQUEST_INTERVAL은 0보다 커야 합니다" }
	}
}

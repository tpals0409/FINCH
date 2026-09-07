package com.finch.domain.price.service

import java.time.Duration
import java.util.concurrent.TimeUnit
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component

/** KIS 실전 REST 호출 시작 시각 사이를 공식 SDK와 같은 50ms 이상으로 유지한다. */
@Component
internal class KisRequestPacer internal constructor(
	private val nanoTime: () -> Long,
	private val sleepNanos: (Long) -> Unit,
) {

	@Autowired
	constructor() : this(System::nanoTime, { TimeUnit.NANOSECONDS.sleep(it) })

	private var lastRequestAt: Long? = null

	@Synchronized
	fun awaitPermit(): Boolean {
		val now = nanoTime()
		val remaining = lastRequestAt?.let { MIN_INTERVAL_NANOS - (now - it) } ?: 0
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

	companion object {
		val MIN_INTERVAL: Duration = Duration.ofMillis(50)
		private val MIN_INTERVAL_NANOS = MIN_INTERVAL.toNanos()
	}
}
